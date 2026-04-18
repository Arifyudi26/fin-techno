/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

// ─── Auto-assign helper ───────────────────────────────────────────────────────
// Called after POST — matches new category keywords against existing transactions.
// Uses raw SQL ILIKE to push matching to DB instead of loading all rows into JS.
async function autoAssignCategory(userId: string, catId: string, catName: string) {
  const db = prisma as any;
  const keywords = catName
    .toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length > 2);
  if (keywords.length === 0) return;

  // Build ILIKE pattern for each keyword: '%keyword%'
  const patterns = keywords.map((k: string) => `%${k}%`);
  const likeClause = patterns.map((_: string, i: number) => `bt.description ILIKE $${i + 2}`).join(" OR ");

  // Bank: insert matching rows directly via raw SQL — no JS loop
  await prisma.$executeRawUnsafe(
    `INSERT INTO "BankTransactionCategory" ("transactionId", "categoryId")
     SELECT bt.id, $1
     FROM "BankTransaction" bt
     JOIN "BankAccount" ba ON ba.id = bt."bankAccountId"
     WHERE ba."ownerId" = $${patterns.length + 2}
       AND (${likeClause})
     ON CONFLICT DO NOTHING`,
    catId,
    ...patterns,
    userId,
  );

  // Wallet: same pattern
  const likeClauseW = patterns.map((_: string, i: number) => `wt.description ILIKE $${i + 2}`).join(" OR ");
  await db.$executeRawUnsafe(
    `INSERT INTO "WalletTransactionCategory" ("transactionId", "categoryId")
     SELECT wt.id, $1
     FROM "WalletTransaction" wt
     JOIN "DigitalWallet" dw ON dw.id = wt."walletId"
     WHERE dw."ownerId" = $${patterns.length + 2}
       AND (${likeClauseW})
     ON CONFLICT DO NOTHING`,
    catId,
    ...patterns,
    userId,
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  // ── GET /categories ──────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      // Single query: fetch categories + count junction rows in one round-trip
      // using LEFT JOIN + COUNT instead of N×2 separate count queries
      type CatRow = {
        id: string;
        name: string;
        code: string;
        description: string | null;
        createdAt: Date;
        transaction_count: bigint;
      };

      const rows = await prisma.$queryRaw<CatRow[]>`
        SELECT
          tc.id,
          tc.name,
          tc.code,
          tc.description,
          tc."createdAt",
          COUNT(btc."transactionId") + COUNT(wtc."transactionId") AS transaction_count
        FROM "TransactionCategory" tc
        LEFT JOIN "BankTransactionCategory"   btc ON btc."categoryId" = tc.id
        LEFT JOIN "WalletTransactionCategory" wtc ON wtc."categoryId" = tc.id
        WHERE tc."userId" = ${userId}
        GROUP BY tc.id
        ORDER BY tc.name ASC
      `;

      const categories = rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description,
        createdAt: r.createdAt,
        transactionCount: Number(r.transaction_count),
      }));

      res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
      return res.status(200).json({ categories });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // ── POST /categories ─────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { name, code, description } = req.body;
    if (!name || !code)
      return res.status(400).json({ message: "name dan code wajib diisi" });

    const codeUpper = (code as string).toUpperCase().slice(0, 5);
    try {
      const [userExists, existing] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
        prisma.transactionCategory.findFirst({ where: { userId, code: codeUpper }, select: { id: true } }),
      ]);

      if (!userExists)
        return res.status(401).json({ message: "User tidak ditemukan, silakan login ulang" });
      if (existing)
        return res.status(409).json({ message: "Kode kategori sudah digunakan" });

      const cat = await prisma.transactionCategory.create({
        data: { userId, name, code: codeUpper, description },
      });

      // Fire-and-forget auto-assign — don't block the response
      autoAssignCategory(userId, cat.id, cat.name).catch(console.error);

      return res.status(201).json({ category: { ...cat, transactionCount: 0 } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
