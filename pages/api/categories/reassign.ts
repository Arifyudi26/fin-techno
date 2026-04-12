/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

type CategoryEntry = { id: string; keywords: string[] };

function resolveCategoryIds(desc: string, categories: CategoryEntry[]): string[] {
  const lower = desc.toLowerCase();
  return categories
    .filter((cat) => cat.keywords.some((k) => lower.includes(k)))
    .map((cat) => cat.id);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const db = prisma as any;

    // Load semua kategori milik user
    const cats = await prisma.transactionCategory.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    if (cats.length === 0) {
      return res.status(200).json({ message: "Tidak ada kategori", assigned: 0 });
    }

    const categories: CategoryEntry[] = cats.map((c) => ({
      id: c.id,
      keywords: c.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2),
    }));

    // Ambil semua transaksi bank milik user yang belum punya kategori
    const bankTx = await prisma.bankTransaction.findMany({
      where: {
        bankAccount: { ownerId: userId },
        categories: { none: {} },
      },
      select: { id: true, description: true },
    });

    // Ambil semua transaksi wallet milik user yang belum punya kategori
    const walletTx = await db.walletTransaction.findMany({
      where: {
        wallet: { ownerId: userId },
        categories: { none: {} },
      },
      select: { id: true, description: true },
    });

    let assigned = 0;

    // Bank transactions
    const bankJunctionRows: { transactionId: string; categoryId: string }[] = [];
    for (const tx of bankTx) {
      const catIds = resolveCategoryIds(tx.description, categories);
      for (const catId of catIds) {
        bankJunctionRows.push({ transactionId: tx.id, categoryId: catId });
      }
    }
    if (bankJunctionRows.length > 0) {
      await prisma.bankTransactionCategory.createMany({
        data: bankJunctionRows,
        skipDuplicates: true,
      });
      assigned += bankJunctionRows.length;
    }

    // Wallet transactions
    const walletJunctionRows: { transactionId: string; categoryId: string }[] = [];
    for (const tx of walletTx) {
      const catIds = resolveCategoryIds(tx.description, categories);
      for (const catId of catIds) {
        walletJunctionRows.push({ transactionId: tx.id, categoryId: catId });
      }
    }
    if (walletJunctionRows.length > 0) {
      await db.walletTransactionCategory.createMany({
        data: walletJunctionRows,
        skipDuplicates: true,
      });
      assigned += walletJunctionRows.length;
    }

    return res.status(200).json({
      message: `Berhasil assign ${assigned} kategori ke ${bankTx.length + walletTx.length} transaksi`,
      assigned,
      bankTxCount: bankTx.length,
      walletTxCount: walletTx.length,
    });
  } catch (error: any) {
    console.error("reassign error:", error);
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
}
