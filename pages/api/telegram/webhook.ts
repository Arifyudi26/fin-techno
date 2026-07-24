/* eslint-disable @typescript-eslint/no-explicit-any */
// Endpoint yang didaftarkan ke Telegram sebagai webhook.
// Telegram mengirim setiap update (pesan) ke sini secara otomatis.
//
// Flow autentikasi bot:
// 1. User buka halaman Profil di web, klik "Hubungkan Telegram"
// 2. Web generate token lalu kirim deep link ke Telegram
// 3. User klik link -> bot terima /start <token>
// 4. Token dicocokkan ke akun user, chatId disimpan ke database
// 5. Selanjutnya setiap pesan dari user dikenali via chatId

import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fmtIDR as fmt } from "@lib/formatters";
import { sendMessage, TelegramUpdate } from "@lib/telegram";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Verifikasi secret header dari Telegram, skip jika request dari localhost (dev polling)
  const isLocalRequest = req.headers.host?.includes("localhost");
  if (WEBHOOK_SECRET && !isLocalRequest) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== WEBHOOK_SECRET) {
      return res.status(403).json({ message: "Forbidden" });
    }
  }

  const update: TelegramUpdate = req.body;
  const msg = update.message;
  if (!msg?.text) return res.status(200).end();

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from.first_name ?? "Kamu";

  try {
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const linkToken = parts[1];

      if (!linkToken) {
        await sendMessage(
          chatId,
          `👋 Halo *${firstName}*\\! Selamat datang di *Fin\\-Techno Bot*\\.\n\n` +
            `Untuk menghubungkan akun kamu, buka halaman *Profil* di web dan klik *Hubungkan Telegram*\\.\n\n` +
            `Kamu akan mendapat link otomatis yang langsung terhubung ke bot ini\\.`
        );
        return res.status(200).end();
      }

      const user = await (prisma as any).user.findFirst({
        where: { telegramLinkToken: linkToken },
      });

      if (!user) {
        await sendMessage(
          chatId,
          "❌ Token tidak valid atau sudah kadaluarsa\\. Silakan generate ulang dari halaman Profil\\."
        );
        return res.status(200).end();
      }

      // Simpan chatId dan hapus token setelah dipakai
      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          telegramChatId: String(chatId),
          telegramLinkToken: null,
        },
      });

      await sendMessage(
        chatId,
        `✅ Akun *${user.name}* berhasil terhubung\\!\n\n` +
          `Sekarang kamu bisa:\n` +
          `📊 /ringkasan — Ringkasan keuangan bulan ini\n` +
          `💬 /tanya \\<pertanyaan\\> — Tanya ke AI asisten\n` +
          `📋 /transaksi — 5 transaksi terakhir\n` +
          `❓ /help — Daftar perintah lengkap`
      );
      return res.status(200).end();
    }

    // Untuk semua perintah lain, cari user berdasarkan chatId
    const user = await (prisma as any).user.findUnique({
      where: { telegramChatId: String(chatId) },
    });

    if (!user) {
      await sendMessage(
        chatId,
        "🔒 Akun belum terhubung\\. Buka halaman *Profil* di web dan klik *Hubungkan Telegram*\\."
      );
      return res.status(200).end();
    }

    const userId: string = user.id;

    if (text === "/help") {
      await sendMessage(
        chatId,
        `📚 *Daftar Perintah Fin\\-Techno Bot*\n\n` +
          `📊 /ringkasan — Ringkasan keuangan bulan ini\n` +
          `📋 /transaksi — 5 transaksi terakhir\n` +
          `💬 /tanya \\<pertanyaan\\> — Tanya ke AI asisten keuangan\n` +
          `🔍 /analisis — Analisis keuangan lengkap oleh AI\n` +
          `❌ /disconnect — Putuskan koneksi akun\n` +
          `❓ /help — Tampilkan pesan ini`
      );
      return res.status(200).end();
    }

    if (text === "/disconnect") {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { telegramChatId: null },
      });
      await sendMessage(
        chatId,
        "✅ Akun berhasil diputuskan dari bot\\. Gunakan /start untuk menghubungkan kembali\\."
      );
      return res.status(200).end();
    }

    if (text === "/ringkasan") {
      const summary = await getFinancialSummary(userId);
      await sendMessage(chatId, summary);
      return res.status(200).end();
    }

    if (text === "/transaksi") {
      const txText = await getRecentTransactions(userId);
      await sendMessage(chatId, txText);
      return res.status(200).end();
    }

    if (text === "/analisis") {
      await sendMessage(chatId, "⏳ Sedang menganalisis data keuangan kamu\\.\\.\\.");
      const analysis = await getAIAnalysis(userId);
      for (const chunk of splitText(analysis, 4000)) {
        await sendMessage(chatId, escapeMarkdown(chunk));
      }
      return res.status(200).end();
    }

    if (text.startsWith("/tanya ")) {
      const question = text.replace("/tanya ", "").trim();
      if (!question) {
        await sendMessage(chatId, "❓ Contoh penggunaan: `/tanya berapa pengeluaran bulan lalu?`");
        return res.status(200).end();
      }
      await sendMessage(chatId, "💭 Sedang mencari jawaban\\.\\.\\.");
      const answer = await getAIChat(userId, question);
      for (const chunk of splitText(answer, 4000)) {
        await sendMessage(chatId, escapeMarkdown(chunk));
      }
      return res.status(200).end();
    }

    // Pesan bebas (bukan command) langsung diteruskan ke AI
    if (!text.startsWith("/")) {
      await sendMessage(chatId, "💭 Sedang memproses\\.\\.\\.");
      const answer = await getAIChat(userId, text);
      for (const chunk of splitText(answer, 4000)) {
        await sendMessage(chatId, escapeMarkdown(chunk));
      }
      return res.status(200).end();
    }

    await sendMessage(chatId, "❓ Perintah tidak dikenal\\. Ketik /help untuk melihat daftar perintah\\.");
    return res.status(200).end();

  } catch (error: any) {
    console.error("Telegram webhook error:", error?.message || error);
    // Selalu return 200 agar Telegram tidak retry terus-menerus
    return res.status(200).end();
  }
}

async function getFinancialSummary(userId: string): Promise<string> {
  const db = prisma as any;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [bankTx, walletTx, bankTxLast, walletTxLast] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { bankAccount: { ownerId: userId }, transactionDate: { gte: startOfMonth } },
      select: { type: true, amount: true },
    }),
    db.walletTransaction.findMany({
      where: { wallet: { ownerId: userId }, transactionDate: { gte: startOfMonth } },
      select: { type: true, amount: true },
    }),
    prisma.bankTransaction.findMany({
      where: {
        bankAccount: { ownerId: userId },
        transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      select: { type: true, amount: true },
    }),
    db.walletTransaction.findMany({
      where: {
        wallet: { ownerId: userId },
        transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      select: { type: true, amount: true },
    }),
  ]);

  const calc = (txs: { type: string; amount: any }[]) => {
    let income = 0, expense = 0;
    for (const tx of txs) {
      if (tx.type === "CREDIT") income += Number(tx.amount);
      else expense += Number(tx.amount);
    }
    return { income, expense, net: income - expense };
  };

  const curr = calc([...bankTx, ...walletTx]);
  const last = calc([...bankTxLast, ...walletTxLast]);

  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const lastMonthName = startOfLastMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const netEmoji = curr.net >= 0 ? "✅" : "⚠️";
  const incomeChange = last.income > 0
    ? ((curr.income - last.income) / last.income * 100).toFixed(1)
    : null;
  const expenseChange = last.expense > 0
    ? ((curr.expense - last.expense) / last.expense * 100).toFixed(1)
    : null;

  return (
    `📊 *Ringkasan Keuangan — ${monthName}*\n\n` +
    `💰 Pemasukan: *${fmt(curr.income)}*` +
    (incomeChange ? ` _(${Number(incomeChange) >= 0 ? "+" : ""}${incomeChange}% vs ${lastMonthName})_` : "") + "\n" +
    `💸 Pengeluaran: *${fmt(curr.expense)}*` +
    (expenseChange ? ` _(${Number(expenseChange) >= 0 ? "+" : ""}${expenseChange}% vs ${lastMonthName})_` : "") + "\n" +
    `${netEmoji} Net Flow: *${fmt(curr.net)}*\n\n` +
    `_Ketik /transaksi untuk melihat transaksi terakhir_\n` +
    `_Ketik /tanya untuk bertanya ke AI_`
  );
}

async function getRecentTransactions(userId: string): Promise<string> {
  const db = prisma as any;

  const [bankTx, walletTx] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { bankAccount: { ownerId: userId } },
      select: {
        transactionDate: true,
        description: true,
        amount: true,
        type: true,
        bankAccount: { select: { bankProvider: true } },
      },
      orderBy: { transactionDate: "desc" },
      take: 5,
    }),
    db.walletTransaction.findMany({
      where: { wallet: { ownerId: userId } },
      select: {
        transactionDate: true,
        description: true,
        amount: true,
        type: true,
        wallet: { select: { walletProvider: true } },
      },
      orderBy: { transactionDate: "desc" },
      take: 5,
    }),
  ]);

  const all = [
    ...bankTx.map((t: any) => ({ ...t, source: t.bankAccount.bankProvider })),
    ...walletTx.map((t: any) => ({ ...t, source: t.wallet.walletProvider })),
  ]
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
    .slice(0, 5);

  if (all.length === 0) return "📋 Belum ada transaksi yang tercatat\\.";

  const rows = all.map((tx: any) => {
    const date = new Date(tx.transactionDate).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
    const emoji = tx.type === "CREDIT" ? "🟢" : "🔴";
    const sign = tx.type === "CREDIT" ? "+" : "-";
    const desc = tx.description.length > 25
      ? tx.description.substring(0, 25) + "..."
      : tx.description;
    return `${emoji} ${date} | ${sign}${fmt(Number(tx.amount))} | ${desc}`;
  });

  return `📋 *5 Transaksi Terakhir*\n\n` + rows.join("\n");
}

async function getAIChat(userId: string, question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "❌ Gemini AI belum dikonfigurasi\\.";

  const db = prisma as any;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [bankTx, walletTx] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { bankAccount: { ownerId: userId }, transactionDate: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, transactionDate: true },
    }),
    db.walletTransaction.findMany({
      where: { wallet: { ownerId: userId }, transactionDate: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, transactionDate: true },
    }),
  ]);

  const allTx = [...bankTx, ...walletTx];
  let totalIncome = 0, totalExpense = 0;
  for (const tx of allTx) {
    if (tx.type === "CREDIT") totalIncome += Number(tx.amount);
    else totalExpense += Number(tx.amount);
  }

  const systemContext =
    `Kamu adalah asisten keuangan pribadi yang cerdas dan ramah. ` +
    `Jawab dalam Bahasa Indonesia yang singkat dan mudah dipahami. ` +
    `Data keuangan pengguna (6 bulan terakhir): ` +
    `Total Pemasukan: ${fmt(totalIncome)}, Total Pengeluaran: ${fmt(totalExpense)}, ` +
    `Net Flow: ${fmt(totalIncome - totalExpense)}, Total Transaksi: ${allTx.length}. ` +
    `Tanggal hari ini: ${now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemContext }] },
      { role: "model", parts: [{ text: "Baik, saya siap membantu!" }] },
    ],
  });

  const result = await chat.sendMessage(question);
  return result.response.text();
}

async function getAIAnalysis(userId: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "❌ Gemini AI belum dikonfigurasi\\.";

  const db = prisma as any;

  const [bankTx, walletTx] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { bankAccount: { ownerId: userId } },
      select: { type: true, amount: true, transactionDate: true },
    }),
    db.walletTransaction.findMany({
      where: { wallet: { ownerId: userId } },
      select: { type: true, amount: true, transactionDate: true },
    }),
  ]);

  const allTx = [...bankTx, ...walletTx];
  let totalIncome = 0, totalExpense = 0;
  for (const tx of allTx) {
    if (tx.type === "CREDIT") totalIncome += Number(tx.amount);
    else totalExpense += Number(tx.amount);
  }

  const prompt =
    `Kamu adalah analis keuangan pribadi. Berikan analisis singkat (maksimal 300 kata) dalam Bahasa Indonesia.\n\n` +
    `Data keuangan pengguna:\n` +
    `- Total Pemasukan: ${fmt(totalIncome)}\n` +
    `- Total Pengeluaran: ${fmt(totalExpense)}\n` +
    `- Net Flow: ${fmt(totalIncome - totalExpense)}\n` +
    `- Total Transaksi: ${allTx.length}\n\n` +
    `Format jawaban:\n` +
    `1. Kondisi Keuangan\n` +
    `2. Hal yang Perlu Diperhatikan\n` +
    `3. Rekomendasi (2-3 poin singkat)`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Escape karakter spesial MarkdownV2 agar tidak merusak format pesan
function escapeMarkdown(text: string): string {
  return text.replace(/([_\[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

// Potong teks panjang jadi beberapa bagian karena Telegram max 4096 karakter per pesan
function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLen));
    start += maxLen;
  }
  return chunks;
}
