import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { MergeStatus } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { id } = req.query as { id: string };
  const report = await prisma.mergeReport.findFirst({ where: { id, createdById: userId } });
  if (!report) return res.status(404).json({ message: "Laporan tidak ditemukan" });

  if (req.method === "GET") {
    const full = await prisma.mergeReport.findFirst({
      where: { id },
      include: {
        items: {
          include: {
            transaction: {
              include: {
                category: { select: { name: true } },
                bankAccount: { select: { bankProvider: true, accountName: true } },
              },
            },
          },
        },
      },
    });
    if (!full) return res.status(404).json({ message: "Laporan tidak ditemukan" });
    return res.status(200).json({
      id: full.id,
      name: full.name,
      periodStart: full.periodStart.toISOString().split("T")[0],
      periodEnd: full.periodEnd.toISOString().split("T")[0],
      status: full.status,
      totalCredit: Number(full.totalCredit),
      totalDebit: Number(full.totalDebit),
      netFlow: Number(full.netFlow),
      createdAt: full.createdAt.toISOString(),
      transactions: full.items.map((item) => ({
        itemId: item.id,
        isDuplicate: item.isDuplicate,
        resolvedNote: item.resolvedNote,
        id: item.transaction.id,
        date: item.transaction.transactionDate.toISOString().split("T")[0],
        description: item.transaction.description,
        type: item.transaction.type,
        amount: Number(item.transaction.amount),
        category: item.transaction.category?.name ?? "Lainnya",
        bank: item.transaction.bankAccount.bankProvider,
        accountName: item.transaction.bankAccount.accountName,
      })),
    });
  }

  if (req.method === "PUT") {
    const { name, status } = req.body;
    const updated = await prisma.mergeReport.update({
      where: { id },
      data: { ...(name ? { name } : {}), ...(status ? { status: status as MergeStatus } : {}) },
    });
    return res.status(200).json({ report: updated });
  }

  if (req.method === "DELETE") {
    await prisma.mergeReport.delete({ where: { id } });
    return res.status(200).json({ message: "Laporan dihapus" });
  }

  return res.status(405).end();
}
