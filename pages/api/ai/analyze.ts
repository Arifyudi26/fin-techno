/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "GEMINI_API_KEY is not configured." });
  }

  const lang = (req.query.lang as string) === "en" ? "en" : "id";
  const isEn = lang === "en";

  try {
    const db = prisma as any;

    // Ambil data 6 bulan terakhir
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [bankTx, walletTx] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: {
          bankAccount: { ownerId: userId },
          transactionDate: { gte: sixMonthsAgo },
        },
        select: { type: true, amount: true, transactionDate: true },
      }),
      db.walletTransaction.findMany({
        where: {
          wallet: { ownerId: userId },
          transactionDate: { gte: sixMonthsAgo },
        },
        select: { type: true, amount: true, transactionDate: true },
      }),
    ]);

    const allTx = [...bankTx, ...walletTx];

    // Agregasi per bulan
    const monthMap: Record<string, { credit: number; debit: number; count: number }> = {};
    for (const tx of allTx) {
      const d = new Date(tx.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { credit: 0, debit: 0, count: 0 };
      if (tx.type === "CREDIT") monthMap[key].credit += Number(tx.amount);
      else monthMap[key].debit += Number(tx.amount);
      monthMap[key].count++;
    }

    const months = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [year, month] = key.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });
        return { key, label, ...v, netFlow: v.credit - v.debit };
      });

    // Agregasi per kategori pengeluaran (bank + wallet)
    const [catRows, walletCatRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ cat_name: string; total: string; cnt: bigint }[]>(
        `
        SELECT COALESCE(tc.name, 'Lainnya') AS cat_name,
               SUM(bt.amount)::text AS total,
               COUNT(*) AS cnt
        FROM "BankTransaction" bt
        JOIN "BankAccount" ba ON ba.id = bt."bankAccountId"
        LEFT JOIN "BankTransactionCategory" btc ON btc."transactionId" = bt.id
        LEFT JOIN "TransactionCategory" tc ON tc.id = btc."categoryId"
        WHERE ba."ownerId" = $1
          AND bt.type = 'DEBIT'
          AND bt."transactionDate" >= $2
        GROUP BY tc.name
        ORDER BY SUM(bt.amount) DESC
        LIMIT 8
        `,
        userId,
        sixMonthsAgo
      ),
      prisma.$queryRawUnsafe<{ cat_name: string; total: string; cnt: bigint }[]>(
        `
        SELECT COALESCE(tc.name, 'Lainnya') AS cat_name,
               SUM(wt.amount)::text AS total,
               COUNT(*) AS cnt
        FROM "WalletTransaction" wt
        JOIN "DigitalWallet" dw ON dw.id = wt."walletId"
        LEFT JOIN "WalletTransactionCategory" wtc ON wtc."transactionId" = wt.id
        LEFT JOIN "TransactionCategory" tc ON tc.id = wtc."categoryId"
        WHERE dw."ownerId" = $1
          AND wt.type = 'DEBIT'
          AND wt."transactionDate" >= $2
        GROUP BY tc.name
        ORDER BY SUM(wt.amount) DESC
        LIMIT 8
        `,
        userId,
        sixMonthsAgo
      ),
    ]);

    // Gabung kategori bank + wallet
    const catMerge: Record<string, number> = {};
    for (const r of [...catRows, ...walletCatRows]) {
      catMerge[r.cat_name] = (catMerge[r.cat_name] || 0) + Number(r.total);
    }
    const topCategories = Object.entries(catMerge)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, amount]) => ({ name, amount }));

    const maxExpenseMonth = [...months].sort((a, b) => b.debit - a.debit)[0];
    const maxIncomeMonth = [...months].sort((a, b) => b.credit - a.credit)[0];

    const totalIncome = months.reduce((s, m) => s + m.credit, 0);
    const totalExpense = months.reduce((s, m) => s + m.debit, 0);
    const netFlow = totalIncome - totalExpense;
    const negativeMonths = months.filter((m) => m.netFlow < 0).length;

    const monthSummary = months
      .map(
        (m) => isEn
          ? `- ${m.label}: Income ${fmt(m.credit)}, Expense ${fmt(m.debit)}, Net Flow ${fmt(m.netFlow)} (${m.count} transactions)`
          : `- ${m.label}: Pemasukan ${fmt(m.credit)}, Pengeluaran ${fmt(m.debit)}, Net Flow ${fmt(m.netFlow)} (${m.count} transaksi)`
      )
      .join("\n");

    const catSummary = topCategories
      .map((c, i) => `${i + 1}. ${c.name}: ${fmt(c.amount)}`)
      .join("\n");

    const prompt = isEn
      ? `You are a personal finance analyst helping users understand their financial condition.
Provide analysis in clear, concise, and actionable English.

USER FINANCIAL DATA (last ${months.length} months):

Total Summary:
- Total Income: ${fmt(totalIncome)}
- Total Expense: ${fmt(totalExpense)}
- Net Flow: ${fmt(netFlow)} (${netFlow >= 0 ? "POSITIVE ✓" : "NEGATIVE ✗"})
- Months with negative cash flow: ${negativeMonths} of ${months.length}

Monthly Data:
${monthSummary || "No data available"}

Highest Expense Month: ${maxExpenseMonth ? `${maxExpenseMonth.label} (${fmt(maxExpenseMonth.debit)})` : "-"}
Highest Income Month: ${maxIncomeMonth ? `${maxIncomeMonth.label} (${fmt(maxIncomeMonth.credit)})` : "-"}

Top Expense Categories:
${catSummary || "No category data available"}

Provide analysis in the following format (use relevant emojis):
1. **Overall Financial Health** - brief status of financial health
2. **Highest Expense Month** - explain which month and possible reasons
3. **Overspending Categories** - categories that need attention
4. **Trend** - whether finances are improving or worsening
5. **Recommendations** - 3 concrete steps to take

Answer in 300-400 words, use easy-to-understand language.`
      : `Kamu adalah analis keuangan pribadi yang membantu pengguna memahami kondisi keuangan mereka.
Berikan analisis dalam Bahasa Indonesia yang jelas, ringkas, dan actionable.

DATA KEUANGAN PENGGUNA (${months.length} bulan terakhir):

Ringkasan Total:
- Total Pemasukan: ${fmt(totalIncome)}
- Total Pengeluaran: ${fmt(totalExpense)}
- Net Flow: ${fmt(netFlow)} (${netFlow >= 0 ? "POSITIF ✓" : "NEGATIF ✗"})
- Bulan dengan cash flow negatif: ${negativeMonths} dari ${months.length} bulan

Data Per Bulan:
${monthSummary || "Belum ada data"}

Pengeluaran Terbesar: ${maxExpenseMonth ? `${maxExpenseMonth.label} (${fmt(maxExpenseMonth.debit)})` : "-"}
Pemasukan Terbesar: ${maxIncomeMonth ? `${maxIncomeMonth.label} (${fmt(maxIncomeMonth.credit)})` : "-"}

Top Kategori Pengeluaran:
${catSummary || "Belum ada data kategori"}

Berikan analisis dengan format berikut (gunakan emoji yang relevan):
1. **Kondisi Keuangan Keseluruhan** - status kesehatan keuangan secara singkat
2. **Bulan Pengeluaran Terbesar** - jelaskan bulan mana dan kemungkinan penyebabnya
3. **Kategori Boros** - kategori pengeluaran yang perlu diperhatikan
4. **Tren** - apakah keuangan membaik atau memburuk
5. **Rekomendasi** - 3 langkah konkret yang bisa dilakukan

Jawab dalam 300-400 kata, gunakan bahasa yang mudah dipahami.`;

    // Inisialisasi Gemini di dalam handler agar env var sudah terbaca
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    return res.status(200).json({
      analysis,
      context: {
        months,
        topCategories,
        totalIncome,
        totalExpense,
        netFlow,
        maxExpenseMonth,
        maxIncomeMonth,
        negativeMonths,
      },
    });
  } catch (error: any) {
    console.error("AI analyze error:", error?.message || error);
    return res.status(500).json({
      message: error?.message || "Failed to analyze financial data.",
    });
  }
}
