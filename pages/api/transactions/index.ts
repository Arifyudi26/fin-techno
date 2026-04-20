import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { wibToUtc } from "@lib/dateUtils";

// GET /api/transactions
// Uses $queryRawUnsafe with dynamic SQL + parameterized user values.
// Single UNION ALL query with CTE window aggregation — 1 round-trip.

function toUtcDate(dateStr: string, endOfDay = false): Date {
  return wibToUtc(dateStr, endOfDay);
}

type TxRow = {
  id: string;
  source: "BANK" | "WALLET";
  transaction_date: Date;
  description: string;
  reference: string | null;
  type: string;
  amount: string;
  balance: string | null;
  status: string;
  account_name: string;
  provider: string;
  category_names: string | null;
  category_codes: string | null;
  total_count: bigint;
  total_credit: string;
  total_debit: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const {
    type, category, search,
    page = "1", limit = "10",
    dateFrom, dateTo,
    source = "ALL",
    accountId,
  } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset   = (pageNum - 1) * limitNum;

  const includeBank   = source === "ALL" || source === "BANK";
  const includeWallet = source === "ALL" || source === "WALLET";

  // Build parameterized query — params array, $1 $2 ... placeholders
  const params: unknown[] = [];
  const p = (val: unknown) => { params.push(val); return `$${params.length}`; };

  const userParam = p(userId);

  // Date range
  const gteParam = dateFrom ? p(toUtcDate(dateFrom))        : null;
  const lteParam = dateTo   ? p(toUtcDate(dateTo, true))    : null;
  const dateClause = (col: string) => {
    if (gteParam && lteParam) return `AND ${col} BETWEEN ${gteParam} AND ${lteParam}`;
    if (gteParam) return `AND ${col} >= ${gteParam}`;
    if (lteParam) return `AND ${col} <= ${lteParam}`;
    return "";
  };

  // Optional filters
  const typeClause   = (col: string) => type && type !== "ALL" ? `AND ${col}::text = ${p(type)}` : "";
  const searchClause = (col: string) => search ? `AND ${col} ILIKE ${p(`%${search}%`)}` : "";

  // accountId filter — only apply to matching source
  const bankAcctClause   = accountId && includeBank   ? `AND bt."bankAccountId" = ${p(accountId)}` : "";
  const walletAcctClause = accountId && includeWallet ? `AND wt."walletId" = ${p(accountId)}` : "";

  // category filter via EXISTS
  const bankCatClause = category
    ? `AND EXISTS (SELECT 1 FROM "BankTransactionCategory" x WHERE x."transactionId" = bt.id AND x."categoryId" = ${p(category)})`
    : "";
  // reuse same category param if already added
  const walletCatClause = category
    ? `AND EXISTS (SELECT 1 FROM "WalletTransactionCategory" x WHERE x."transactionId" = wt.id AND x."categoryId" = $${params.length})`
    : "";

  const limitParam  = p(limitNum);
  const offsetParam = p(offset);

  const bankBlock = includeBank ? `
    SELECT
      bt.id,
      'BANK'                                    AS source,
      bt."transactionDate"                      AS transaction_date,
      bt.description,
      bt.reference,
      bt.type::text,
      bt.amount::text,
      bt.balance::text,
      bt.status::text,
      ba."accountName"                          AS account_name,
      ba."bankProvider"::text                   AS provider,
      STRING_AGG(DISTINCT tc.name, ',')         AS category_names,
      STRING_AGG(DISTINCT tc.code, ',')         AS category_codes
    FROM "BankTransaction" bt
    JOIN "BankAccount" ba ON ba.id = bt."bankAccountId"
    LEFT JOIN "BankTransactionCategory" btc ON btc."transactionId" = bt.id
    LEFT JOIN "TransactionCategory" tc ON tc.id = btc."categoryId"
    WHERE ba."ownerId" = ${userParam}
      ${dateClause('bt."transactionDate"')}
      ${typeClause('bt.type')}
      ${searchClause('bt.description')}
      ${bankAcctClause}
      ${bankCatClause}
    GROUP BY bt.id, ba."accountName", ba."bankProvider"
  ` : "";

  const walletBlock = includeWallet ? `
    SELECT
      wt.id,
      'WALLET'                                  AS source,
      wt."transactionDate"                      AS transaction_date,
      wt.description,
      wt.reference,
      wt.type::text,
      wt.amount::text,
      wt.balance::text,
      wt.status::text,
      dw."accountName"                          AS account_name,
      dw."walletProvider"::text                 AS provider,
      STRING_AGG(DISTINCT tc.name, ',')         AS category_names,
      STRING_AGG(DISTINCT tc.code, ',')         AS category_codes
    FROM "WalletTransaction" wt
    JOIN "DigitalWallet" dw ON dw.id = wt."walletId"
    LEFT JOIN "WalletTransactionCategory" wtc ON wtc."transactionId" = wt.id
    LEFT JOIN "TransactionCategory" tc ON tc.id = wtc."categoryId"
    WHERE dw."ownerId" = ${userParam}
      ${dateClause('wt."transactionDate"')}
      ${typeClause('wt.type')}
      ${searchClause('wt.description')}
      ${walletAcctClause}
      ${walletCatClause}
    GROUP BY wt.id, dw."accountName", dw."walletProvider"
  ` : "";

  const unionParts = [bankBlock, walletBlock].filter(Boolean).join("\n    UNION ALL\n");

  const sql = `
    WITH base AS (
      ${unionParts}
    ),
    agg AS (
      SELECT
        COUNT(*)                                                              AS total_count,
        COALESCE(SUM(amount::numeric) FILTER (WHERE type = 'CREDIT'), 0)::text AS total_credit,
        COALESCE(SUM(amount::numeric) FILTER (WHERE type = 'DEBIT'),  0)::text AS total_debit
      FROM base
    )
    SELECT b.*, a.total_count, a.total_credit, a.total_debit
    FROM base b, agg a
    ORDER BY b.transaction_date DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  try {
    const rows = await prisma.$queryRawUnsafe<TxRow[]>(sql, ...params);

    const total       = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const totalCredit = rows.length > 0 ? Number(rows[0].total_credit) : 0;
    const totalDebit  = rows.length > 0 ? Number(rows[0].total_debit)  : 0;

    const transactions = rows.map((r) => {
      const catNames = r.category_names ? r.category_names.split(",") : [];
      const catCodes = r.category_codes ? r.category_codes.split(",") : [];
      return {
        id:           r.id,
        source:       r.source,
        date:         r.transaction_date.toISOString().split("T")[0],
        description:  r.description,
        reference:    r.reference ?? null,
        type:         r.type,
        amount:       Number(r.amount),
        balance:      r.balance != null ? Number(r.balance) : null,
        status:       r.status,
        accountName:  r.account_name,
        provider:     r.provider,
        categories:   catNames.map((name, i) => ({ name, code: catCodes[i] ?? "" })),
        category:     catNames[0] ?? "Lainnya",
        categoryCode: catCodes[0] ?? "LNY",
      };
    });

    res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res.status(200).json({
      transactions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      summary: { totalCredit, totalDebit, netFlow: totalCredit - totalDebit },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
