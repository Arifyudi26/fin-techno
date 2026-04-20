import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { wibToUtc, utcToWibDateStr } from "@lib/dateUtils";

// GET /api/calendar?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
// Returns ONLY daily summaries (no transaction detail) — keeps payload small.
// Detail per day is fetched lazily via GET /api/calendar/[date]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) return res.status(400).json({ message: "dateFrom and dateTo required" });

  const gte = wibToUtc(dateFrom as string);
  const lte = wibToUtc(dateTo as string, true);

  try {
    const [bankRows, walletRows] = await Promise.all([
      prisma.bankTransaction.groupBy({
        by: ["transactionDate", "type"],
        where: {
          bankAccount: { ownerId: userId },
          transactionDate: { gte, lte },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { transactionDate: "asc" },
      }),
      prisma.walletTransaction.groupBy({
        by: ["transactionDate", "type"],
        where: {
          wallet: { ownerId: userId },
          transactionDate: { gte, lte },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { transactionDate: "asc" },
      }),
    ]);

    const map: Record<string, { date: string; totalCredit: number; totalDebit: number; count: number }> = {};

    const addRow = (row: { transactionDate: Date; type: string; _sum: { amount: unknown }; _count: { id: number } }) => {
      const date = utcToWibDateStr(row.transactionDate);
      if (!map[date]) map[date] = { date, totalCredit: 0, totalDebit: 0, count: 0 };
      const amount = Number(row._sum.amount ?? 0);
      map[date].count += row._count.id;
      if (row.type === "CREDIT") map[date].totalCredit += amount;
      else map[date].totalDebit += amount;
    };

    bankRows.forEach(addRow);
    walletRows.forEach(addRow);

    res.setHeader("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return res.status(200).json(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
