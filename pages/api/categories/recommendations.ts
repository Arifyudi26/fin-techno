/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { buildCategorySuggestions } from "@lib/categoryMatcher";
import { st, getLang } from "@lib/server-i18n";

// GET /api/categories/recommendations
// Rule-based (tanpa AI): agregasi transaksi yang BELUM punya kategori,
// cocokkan deskripsinya dengan kamus keyword, lalu sarankan kategori baru
// beserta jumlah transaksi & total nominal yang akan tercakup.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: st(req, "unauthorized") });
  }

  try {
    const db = prisma as any;
    const lang = getLang(req);

    // Ambil transaksi bank & wallet milik user yang belum terkategorikan +
    // kategori existing (untuk dedup usulan).
    const [bankTx, walletTx, existingCats] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: { bankAccount: { ownerId: userId }, categories: { none: {} } },
        select: { description: true, amount: true },
      }),
      db.walletTransaction.findMany({
        where: { wallet: { ownerId: userId }, categories: { none: {} } },
        select: { description: true, amount: true },
      }),
      prisma.transactionCategory.findMany({
        where: { userId },
        select: { name: true, code: true },
      }),
    ]);

    const transactions = [...bankTx, ...walletTx].map((tx: any) => ({
      description: tx.description as string,
      amount: Number(tx.amount),
    }));

    const totalUncategorized = transactions.length;

    const existingCodes = new Set(
      existingCats.map((c) => c.code.toLowerCase()),
    );
    const existingNames = new Set(
      existingCats.map((c) => c.name.toLowerCase()),
    );

    const suggestions = buildCategorySuggestions(
      transactions,
      lang,
      existingCodes,
      existingNames,
    );

    res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res.status(200).json({ suggestions, totalUncategorized });
  } catch (e) {
    console.error("recommendations error:", e);
    return res.status(500).json({ message: st(req, "serverError") });
  }
}
