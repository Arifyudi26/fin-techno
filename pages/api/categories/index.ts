/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { st } from "@lib/server-i18n";
import { CATEGORY_TEMPLATES } from "@lib/categoryMatcher";

// Called after POST — matches new category keywords against existing transactions.
// Uses raw SQL ILIKE to push matching to DB instead of loading all rows into JS.
// If the category code matches a known recommendation template, use that
// template's rich keyword list so auto-assign matches the recommendation count.
async function autoAssignCategory(userId: string, catId: string, catName: string, catCode: string): Promise<number> {
  const db = prisma as any;
  const template = CATEGORY_TEMPLATES.find((t) => t.code === catCode);
  const keywords = template
    ? template.keywords.map((k) => k.trim()).filter((k) => k.length > 1)
    : catName
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 2);
  if (keywords.length === 0) return 0;

  // Build ILIKE pattern for each keyword: '%keyword%'
  const patterns = keywords.map((k: string) => `%${k}%`);
  const likeClause = patterns.map((_: string, i: number) => `bt.description ILIKE $${i + 2}`).join(" OR ");

  // Bank: insert matching rows directly via raw SQL — no JS loop.
  // $executeRawUnsafe returns the number of affected rows.
  const bankAssigned = await prisma.$executeRawUnsafe(
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
  const walletAssigned = await db.$executeRawUnsafe(
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

  return Number(bankAssigned ?? 0) + Number(walletAssigned ?? 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: st(req, "unauthorized") }); }

  // GET /categories 
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
      return res.status(500).json({ message: st(req, "serverError") });
    }
  }

  // POST /categories 
  if (req.method === "POST") {
    const { name, code, description } = req.body;
    if (!name || !code)
      return res.status(400).json({ message: st(req, "categoryRequiredFields") });

    const codeUpper = (code as string).toUpperCase().slice(0, 5);
    try {
      const [userExists, existing] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
        prisma.transactionCategory.findFirst({ where: { userId, code: codeUpper }, select: { id: true } }),
      ]);

      if (!userExists)
        return res.status(401).json({ message: st(req, "userNotFoundRelogin") });
      if (existing)
        return res.status(409).json({ message: st(req, "categoryCodeUsed") });

      const cat = await prisma.transactionCategory.create({
        data: { userId, name, code: codeUpper, description },
      });

      // Await auto-assign so the response carries the real transaction count.
      // This runs as a single INSERT...SELECT per table (set-based, not a JS
      // loop), so it stays fast even for thousands of transactions.
      const transactionCount = await autoAssignCategory(userId, cat.id, cat.name, cat.code)
        .catch((e) => { console.error("autoAssign error:", e); return 0; });

      return res.status(201).json({ category: { ...cat, transactionCount } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: st(req, "serverError") });
    }
  }

  return res.status(405).end();
}
