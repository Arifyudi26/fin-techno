/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) return res.status(400).json({ message: "dateFrom and dateTo required" });

  const gte = new Date(dateFrom as string);
  const lte = new Date(new Date(dateTo as string).setHours(23, 59, 59, 999));

  try {
    const db = prisma as any;

    const [bankTx, walletTx] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: { bankAccount: { ownerId: userId }, transactionDate: { gte, lte } },
        select: { transactionDate: true, type: true, amount: true, description: true, id: true },
      }),
      db.walletTransaction.findMany({
        where: { wallet: { ownerId: userId }, transactionDate: { gte, lte } },
        select: { transactionDate: true, type: true, amount: true, description: true, id: true },
      }),
    ]);

    // Group by date
    const map: Record<string, { totalCredit: number; totalDebit: number; count: number }> = {};

    const add = (t: any) => {
      const date = t.transactionDate.toISOString().split("T")[0];
      if (!map[date]) map[date] = { totalCredit: 0, totalDebit: 0, count: 0 };
      map[date].count++;
      if (t.type === "CREDIT") map[date].totalCredit += Number(t.amount);
      else map[date].totalDebit += Number(t.amount);
    };

    bankTx.forEach(add);
    walletTx.forEach(add);

    const result = Object.entries(map).map(([date, v]) => ({ date, ...v }));
    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
