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
  if (req.method !== "POST") return res.status(405).end();

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

  const { message, history, lang } = req.body as {
    message: string;
    history: { role: "user" | "model"; parts: string }[];
    lang?: "id" | "en";
  };

  if (!message?.trim()) {
    return res.status(400).json({ message: "Message cannot be empty." });
  }

  try {
    const db = prisma as any;

    // Ambil data keuangan user sebagai konteks
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

    const isEn = lang === "en";

    const months = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [year, month] = key.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
          isEn ? "en-US" : "id-ID",
          { month: "long", year: "numeric" }
        );
        return { key, label, ...v, netFlow: v.credit - v.debit };
      });

    // Top kategori pengeluaran
    const catRows = await prisma.$queryRawUnsafe<
      { cat_name: string; total: string }[]
    >(
      `
      SELECT COALESCE(tc.name, 'Lainnya') AS cat_name,
             SUM(bt.amount)::text AS total
      FROM "BankTransaction" bt
      JOIN "BankAccount" ba ON ba.id = bt."bankAccountId"
      LEFT JOIN "BankTransactionCategory" btc ON btc."transactionId" = bt.id
      LEFT JOIN "TransactionCategory" tc ON tc.id = btc."categoryId"
      WHERE ba."ownerId" = $1
        AND bt.type = 'DEBIT'
        AND bt."transactionDate" >= $2
      GROUP BY tc.name
      ORDER BY SUM(bt.amount) DESC
      LIMIT 6
      `,
      userId,
      sixMonthsAgo
    );

    const totalIncome = months.reduce((s, m) => s + m.credit, 0);
    const totalExpense = months.reduce((s, m) => s + m.debit, 0);
    const netFlow = totalIncome - totalExpense;

    const monthSummary = months
      .map((m) => isEn
        ? `${m.label}: income ${fmt(m.credit)}, expense ${fmt(m.debit)}, net ${fmt(m.netFlow)}`
        : `${m.label}: masuk ${fmt(m.credit)}, keluar ${fmt(m.debit)}, net ${fmt(m.netFlow)}`
      )
      .join(" | ");

    const catSummary = catRows
      .map((c) => `${c.cat_name}: ${fmt(Number(c.total))}`)
      .join(", ");

    // Konteks keuangan sebagai pesan sistem di awal history
    const systemContext = isEn
      ? `You are a smart and friendly personal finance assistant. \
You have access to the user's financial data and must answer questions based on that data. \
Always respond in natural, easy-to-understand English. \
If asked about topics unrelated to finance, politely redirect back to financial topics.

USER FINANCIAL DATA (last 6 months):
- Total Income: ${fmt(totalIncome)}
- Total Expense: ${fmt(totalExpense)}
- Net Flow: ${fmt(netFlow)} (${netFlow >= 0 ? "POSITIVE" : "NEGATIVE"})
- Total Transactions: ${allTx.length}

Monthly Data: ${monthSummary || "No data available"}

Top Expense Categories: ${catSummary || "No category data available"}

Today's date: ${now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`
      : `Kamu adalah asisten keuangan pribadi yang cerdas dan ramah. \
Kamu memiliki akses ke data keuangan pengguna dan harus menjawab pertanyaan berdasarkan data tersebut. \
Selalu jawab dalam Bahasa Indonesia yang natural dan mudah dipahami. \
Jika ditanya hal di luar keuangan, arahkan kembali ke topik keuangan dengan sopan.

DATA KEUANGAN PENGGUNA (6 bulan terakhir):
- Total Pemasukan: ${fmt(totalIncome)}
- Total Pengeluaran: ${fmt(totalExpense)}
- Net Flow: ${fmt(netFlow)} (${netFlow >= 0 ? "POSITIF" : "NEGATIF"})
- Total Transaksi: ${allTx.length}

Data Per Bulan: ${monthSummary || "Belum ada data"}

Top Kategori Pengeluaran: ${catSummary || "Belum ada data kategori"}

Tanggal hari ini: ${now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;

    // Inisialisasi Gemini di dalam handler agar env var sudah terbaca
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Bangun history: system context sebagai pasangan user/model pertama,
    // lalu history percakapan sebelumnya
    const chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [
      {
        role: "user",
        parts: [{ text: systemContext }],
      },
      {
        role: "model",
        parts: [{ text: isEn
          ? "Got it! I've reviewed your financial data and I'm ready to help."
          : "Baik, saya sudah memahami data keuangan kamu dan siap membantu!"
        }],
      },
      ...(history || []).map((h) => ({
        role: h.role,
        parts: [{ text: h.parts }],
      })),
    ];

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message.trim());
    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("AI chat error:", error?.message || error);
    return res.status(500).json({
      message: error?.message || "Failed to get AI response.",
    });
  }
}
