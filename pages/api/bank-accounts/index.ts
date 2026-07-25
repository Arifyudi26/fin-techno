import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { BankProvider } from "@prisma/client";

// Single raw SQL query replaces N×3 aggregate queries.
// Fetches accounts + credit/debit sums + tx count + last upload in one round-trip.

type AccountRow = {
  id: string;
  bank_provider: string;
  account_number: string;
  account_name: string;
  currency: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  total_uploads: bigint;
  total_transactions: bigint;
  total_credit: string | null;
  total_debit: string | null;
  last_upload_date: Date | null;
  last_period_end: Date | null;
  last_upload_credit: string | null;
  last_upload_debit: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  // GET 
  if (req.method === "GET") {
    try {
      const rows = await prisma.$queryRaw<AccountRow[]>`
        SELECT
          ba.id,
          ba."bankProvider"    AS bank_provider,
          ba."accountNumber"   AS account_number,
          ba."accountName"     AS account_name,
          ba.currency,
          ba.description,
          ba."isActive"        AS is_active,
          ba."createdAt"       AS created_at,

          -- upload count
          COUNT(DISTINCT bsu.id)                                    AS total_uploads,

          -- transaction aggregates (all in one pass)
          COUNT(bt.id)                                              AS total_transactions,
          SUM(bt.amount) FILTER (WHERE bt.type = 'CREDIT')         AS total_credit,
          SUM(bt.amount) FILTER (WHERE bt.type = 'DEBIT')          AS total_debit,

          -- latest upload info (subquery — avoids DISTINCT ON complexity)
          lu."createdAt"       AS last_upload_date,
          lu."periodEnd"       AS last_period_end,
          lu."totalCredit"     AS last_upload_credit,
          lu."totalDebit"      AS last_upload_debit

        FROM "BankAccount" ba
        LEFT JOIN "BankStatementUpload" bsu ON bsu."bankAccountId" = ba.id
        LEFT JOIN "BankTransaction"     bt  ON bt."bankAccountId"  = ba.id
        LEFT JOIN LATERAL (
          SELECT "createdAt", "periodEnd", "totalCredit", "totalDebit"
          FROM "BankStatementUpload"
          WHERE "bankAccountId" = ba.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) lu ON true

        WHERE ba."ownerId" = ${userId}
        GROUP BY ba.id, lu."createdAt", lu."periodEnd", lu."totalCredit", lu."totalDebit"
        ORDER BY ba."createdAt" ASC
      `;

      const accounts = rows.map((r) => {
        const lastCredit = Number(r.last_upload_credit ?? 0);
        const lastDebit  = Number(r.last_upload_debit  ?? 0);
        return {
          id: r.id,
          bankProvider:      r.bank_provider,
          accountNumber:     r.account_number,
          accountName:       r.account_name,
          currency:          r.currency,
          description:       r.description,
          isActive:          r.is_active,
          createdAt:         r.created_at.toISOString(),
          totalUploads:      Number(r.total_uploads),
          totalTransactions: Number(r.total_transactions),
          totalCredit:       Number(r.total_credit  ?? 0),
          totalDebit:        Number(r.total_debit   ?? 0),
          lastUploadDate:    r.last_upload_date?.toISOString()              ?? null,
          lastPeriodEnd:     r.last_period_end?.toISOString().split("T")[0] ?? null,
          lastBalance:       lastCredit - lastDebit,
        };
      });

      res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
      return res.status(200).json({ accounts });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // POST 
  if (req.method === "POST") {
    const { bankProvider, accountNumber, accountName, description } = req.body;
    if (!bankProvider || !accountNumber || !accountName) {
      return res.status(400).json({ message: "bankProvider, accountNumber, accountName wajib diisi" });
    }
    try {
      const existing = await prisma.bankAccount.findUnique({
        where: { accountNumber },
        select: { id: true },
      });
      if (existing) return res.status(409).json({ message: "Nomor rekening sudah terdaftar" });

      const account = await prisma.bankAccount.create({
        data: {
          bankProvider: bankProvider as BankProvider,
          accountNumber,
          accountName,
          description,
          ownerId: userId,
        },
      });
      return res.status(201).json({ account });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
