import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { MergeStatus } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  if (req.method === "GET") {
    try {
      const reports = await prisma.mergeReport.findMany({
        where: { createdById: userId },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({
        reports: reports.map((r) => ({
          id: r.id,
          name: r.name,
          periodStart: r.periodStart.toISOString().split("T")[0],
          periodEnd: r.periodEnd.toISOString().split("T")[0],
          status: r.status,
          totalCredit: Number(r.totalCredit),
          totalDebit: Number(r.totalDebit),
          netFlow: Number(r.netFlow),
          txCount: r._count.items,
          createdAt: r.createdAt.toISOString().split("T")[0],
        })),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { name, periodStart, periodEnd, transactionIds, status = "DRAFT" } = req.body;
    if (!name || !periodStart || !periodEnd || !Array.isArray(transactionIds)) {
      return res.status(400).json({ message: "name, periodStart, periodEnd, transactionIds wajib diisi" });
    }
    try {
      // fetch transactions to compute totals
      const txs = await prisma.bankTransaction.findMany({
        where: { id: { in: transactionIds }, bankAccount: { ownerId: userId } },
        select: { id: true, type: true, amount: true },
      });

      const totalCredit = txs.filter(t => t.type === "CREDIT").reduce((s, t) => s + Number(t.amount), 0);
      const totalDebit = txs.filter(t => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0);

      const report = await prisma.mergeReport.create({
        data: {
          name,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          status: status as MergeStatus,
          totalCredit,
          totalDebit,
          netFlow: totalCredit - totalDebit,
          createdById: userId,
          items: {
            create: txs.map((t) => ({ transactionId: t.id, isDuplicate: false })),
          },
        },
      });
      return res.status(201).json({ report });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
