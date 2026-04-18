import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

// GET /api/calendar/[date]  (date = YYYY-MM-DD)
// Single-query approach using raw SQL with JOIN to avoid N+1 on categories.
// Timezone: WIB = UTC+7, so "2026-04-18" local = "2026-04-17T17:00:00Z" to "2026-04-18T16:59:59.999Z"

const WIB_OFFSET_HOURS = 7;

function dayRangeUTC(dateStr: string): { gte: Date; lte: Date } {
  // Parse as local WIB midnight, convert to UTC
  const [y, m, d] = dateStr.split("-").map(Number);
  const gte = new Date(Date.UTC(y, m - 1, d, 0 - WIB_OFFSET_HOURS, 0, 0, 0));
  const lte = new Date(Date.UTC(y, m - 1, d, 24 - WIB_OFFSET_HOURS, 0, 0, -1));
  return { gte, lte };
}

interface RawTxRow {
  id: string;
  transaction_date: Date;
  type: string;
  amount: string;
  description: string;
  reference: string | null;
  balance: string | null;
  status: string;
  provider: string;
  account_name: string;
  source: "BANK" | "WALLET";
  category_names: string | null; // comma-separated from STRING_AGG
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { date } = req.query;
  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "date must be YYYY-MM-DD" });
  }

  const { gte, lte } = dayRangeUTC(date);

  try {
    // Single raw SQL query with LEFT JOIN for categories — 1 round-trip instead of N+1
    // UNION ALL merges bank + wallet transactions
    const rows = await prisma.$queryRaw<RawTxRow[]>`
      SELECT
        bt.id,
        bt."transactionDate"   AS transaction_date,
        bt.type::text,
        bt.amount::text,
        bt.description,
        bt.reference,
        bt.balance::text,
        bt.status::text,
        ba."bankProvider"::text AS provider,
        ba."accountName"        AS account_name,
        'BANK'::text            AS source,
        STRING_AGG(tc.name, ',') AS category_names
      FROM "BankTransaction" bt
      JOIN "BankAccount" ba ON ba.id = bt."bankAccountId"
      LEFT JOIN "BankTransactionCategory" btc ON btc."transactionId" = bt.id
      LEFT JOIN "TransactionCategory" tc ON tc.id = btc."categoryId"
      WHERE ba."ownerId" = ${userId}
        AND bt."transactionDate" >= ${gte}
        AND bt."transactionDate" <= ${lte}
      GROUP BY bt.id, ba."bankProvider", ba."accountName"

      UNION ALL

      SELECT
        wt.id,
        wt."transactionDate"   AS transaction_date,
        wt.type::text,
        wt.amount::text,
        wt.description,
        wt.reference,
        wt.balance::text,
        wt.status::text,
        dw."walletProvider"::text AS provider,
        dw."accountName"          AS account_name,
        'WALLET'::text            AS source,
        STRING_AGG(tc.name, ',')  AS category_names
      FROM "WalletTransaction" wt
      JOIN "DigitalWallet" dw ON dw.id = wt."walletId"
      LEFT JOIN "WalletTransactionCategory" wtc ON wtc."transactionId" = wt.id
      LEFT JOIN "TransactionCategory" tc ON tc.id = wtc."categoryId"
      WHERE dw."ownerId" = ${userId}
        AND wt."transactionDate" >= ${gte}
        AND wt."transactionDate" <= ${lte}
      GROUP BY wt.id, dw."walletProvider", dw."accountName"

      ORDER BY transaction_date ASC
    `;

    const transactions = rows.map((r) => ({
      id: r.id,
      datetime: r.transaction_date.toISOString(),
      type: r.type,
      amount: Number(r.amount),
      description: r.description,
      reference: r.reference ?? null,
      balance: r.balance != null ? Number(r.balance) : null,
      status: r.status ?? "PENDING",
      provider: r.provider,
      accountName: r.account_name,
      source: r.source,
      categories: r.category_names
        ? r.category_names.split(",").map((name) => ({ name }))
        : [],
    }));

    res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res.status(200).json(transactions);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
