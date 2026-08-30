/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { loadCategories, resolveCategoryIds } from "@lib/categoryMatcher";
import { st, getLang } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: st(req, "unauthorized") });
  }

  try {
    const db = prisma as any;

    // Load semua kategori milik user
    const categories = await loadCategories(userId);

    if (categories.length === 0) {
      return res.status(200).json({ message: st(req, "noCategory"), assigned: 0 });
    }

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

    let assignedTxCount = 0;

    // Bank transactions
    const bankJunctionRows: { transactionId: string; categoryId: string }[] = [];
    for (const tx of bankTx) {
      const catIds = resolveCategoryIds(tx.description, categories);
      if (catIds.length > 0) {
        assignedTxCount++;
        for (const catId of catIds) {
          bankJunctionRows.push({ transactionId: tx.id, categoryId: catId });
        }
      }
    }
    if (bankJunctionRows.length > 0) {
      await prisma.bankTransactionCategory.createMany({
        data: bankJunctionRows,
        skipDuplicates: true,
      });
    }

    // Wallet transactions
    const walletJunctionRows: { transactionId: string; categoryId: string }[] = [];
    for (const tx of walletTx) {
      const catIds = resolveCategoryIds(tx.description, categories);
      if (catIds.length > 0) {
        assignedTxCount++;
        for (const catId of catIds) {
          walletJunctionRows.push({ transactionId: tx.id, categoryId: catId });
        }
      }
    }
    if (walletJunctionRows.length > 0) {
      await db.walletTransactionCategory.createMany({
        data: walletJunctionRows,
        skipDuplicates: true,
      });
    }

    const totalTx = bankTx.length + walletTx.length;
    const unmatched = totalTx - assignedTxCount;

    const summary = getLang(req) === "en"
      ? `${assignedTxCount} of ${totalTx} transactions successfully assigned categories${unmatched > 0 ? `, ${unmatched} did not match any keyword` : ""}`
      : `${assignedTxCount} dari ${totalTx} transaksi berhasil di-assign kategori${unmatched > 0 ? `, ${unmatched} tidak cocok keyword manapun` : ""}`;

    return res.status(200).json({
      message: summary,
      assignedTxCount,
      totalTx,
      unmatched,
      junctionRowsCreated: bankJunctionRows.length + walletJunctionRows.length,
    });
  } catch (error: any) {
    console.error("reassign error:", error);
    return res.status(500).json({ message: st(req, "serverError") });
  }
}
