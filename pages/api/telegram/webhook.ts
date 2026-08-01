/* eslint-disable @typescript-eslint/no-explicit-any */
// Endpoint yang didaftarkan ke Telegram sebagai webhook.
// Mendukung: ringkasan, transaksi, AI chat, analisis, dan INPUT TRANSAKSI (bank/wallet/manual)

import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fmtIDR as fmt } from "@lib/formatters";
import { sendMessage, TelegramUpdate } from "@lib/telegram";
import crypto from "crypto";
import {
  BankProvider,
  WalletProvider,
  TransactionType,
  EStatementStatus,
  UploadStatus,
  FileFormat,
} from "@prisma/client";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

// Conversation state (in-memory, per chatId) 
// State dibersihkan otomatis setelah 10 menit idle
type InputStep =
  | "CHOOSE_SOURCE"      // Pilih bank / wallet / manual
  | "CHOOSE_ACCOUNT"     // Pilih akun bank atau wallet
  | "CHOOSE_TYPE"        // CREDIT atau DEBIT
  | "INPUT_AMOUNT"       // Nominal
  | "INPUT_DESCRIPTION"  // Deskripsi
  | "INPUT_DATE"         // Tanggal (opsional)
  | "CONFIRM";           // Konfirmasi simpan

interface ConvState {
  step: InputStep;
  source?: "BANK" | "WALLET" | "MANUAL";
  accountId?: string;
  accountLabel?: string;
  type?: "CREDIT" | "DEBIT";
  amount?: number;
  description?: string;
  date?: Date;
  lastActivity: number;
}

const sessions = new Map<number, ConvState>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 menit

function getSession(chatId: number): ConvState | undefined {
  const s = sessions.get(chatId);
  if (s && Date.now() - s.lastActivity > SESSION_TTL_MS) {
    sessions.delete(chatId);
    return undefined;
  }
  return s;
}

function setSession(chatId: number, state: ConvState) {
  sessions.set(chatId, { ...state, lastActivity: Date.now() });
}

function clearSession(chatId: number) {
  sessions.delete(chatId);
}

// Main handler 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const isLocalRequest = req.headers.host?.includes("localhost");
  if (WEBHOOK_SECRET && !isLocalRequest) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== WEBHOOK_SECRET) return res.status(403).json({ message: "Forbidden" });
  }

  const update: TelegramUpdate = req.body;
  const msg = update.message;
  if (!msg?.text) return res.status(200).end();

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from.first_name ?? "Kamu";

  try {
    // /start 
    if (text.startsWith("/start")) {
      clearSession(chatId);
      const parts = text.split(" ");
      const linkToken = parts[1];

      if (!linkToken) {
        await sendMessage(chatId,
          `👋 Halo *${firstName}*\\! Selamat datang di *Fin\\-Techno Bot*\\.\n\n` +
          `Buka halaman *Profil* di web dan klik *Hubungkan Telegram* untuk menghubungkan akun\\.`
        );
        return res.status(200).end();
      }

      const user = await (prisma as any).user.findFirst({ where: { telegramLinkToken: linkToken } });
      if (!user) {
        await sendMessage(chatId, "❌ Token tidak valid atau sudah kadaluarsa\\. Silakan generate ulang dari halaman Profil\\.");
        return res.status(200).end();
      }

      await (prisma as any).user.update({
        where: { id: user.id },
        data: { telegramChatId: String(chatId), telegramLinkToken: null },
      });

      await sendMessage(chatId,
        `✅ Akun *${escMd(user.name)}* berhasil terhubung\\!\n\n` +
        `📊 /ringkasan — Ringkasan keuangan bulan ini\n` +
        `📋 /transaksi — 5 transaksi terakhir\n` +
        `➕ /input — Input transaksi baru\n` +
        `🔍 /analisis — Analisis AI lengkap\n` +
        `💬 /tanya \\<pertanyaan\\> — Tanya ke AI\n` +
        `❓ /help — Daftar perintah lengkap`
      );
      return res.status(200).end();
    }

    // Cari user berdasarkan chatId 
    const user = await (prisma as any).user.findUnique({ where: { telegramChatId: String(chatId) } });
    if (!user) {
      await sendMessage(chatId, "🔒 Akun belum terhubung\\. Buka halaman *Profil* di web dan klik *Hubungkan Telegram*\\.");
      return res.status(200).end();
    }
    const userId: string = user.id;

    // /batal — batalkan session aktif 
    if (text === "/batal" || text === "/cancel") {
      if (getSession(chatId)) {
        clearSession(chatId);
        await sendMessage(chatId, "❌ Input dibatalkan\\. Ketik /help untuk melihat perintah\\.");
      } else {
        await sendMessage(chatId, "ℹ️ Tidak ada proses aktif yang perlu dibatalkan\\.");
      }
      return res.status(200).end();
    }

    // Jika ada session aktif, teruskan ke flow input 
    const session = getSession(chatId);
    if (session) {
      await handleInputFlow(chatId, userId, text, session);
      return res.status(200).end();
    }

    // Perintah standar 
    if (text === "/help") {
      await sendMessage(chatId,
        `📚 *Daftar Perintah Fin\\-Techno Bot*\n\n` +
        `📊 /ringkasan — Ringkasan keuangan bulan ini\n` +
        `📋 /transaksi — 5 transaksi terakhir\n` +
        `➕ /input — Input transaksi baru \\(bank/wallet/manual\\)\n` +
        `🔍 /analisis — Analisis keuangan lengkap oleh AI\n` +
        `💬 /tanya \\<pertanyaan\\> — Tanya ke AI asisten\n` +
        `❌ /batal — Batalkan input yang sedang berjalan\n` +
        `🔌 /disconnect — Putuskan koneksi akun\n` +
        `❓ /help — Tampilkan pesan ini`
      );
      return res.status(200).end();
    }

    if (text === "/disconnect") {
      await (prisma as any).user.update({ where: { id: userId }, data: { telegramChatId: null } });
      await sendMessage(chatId, "✅ Akun berhasil diputuskan\\. Gunakan /start untuk menghubungkan kembali\\.");
      return res.status(200).end();
    }

    if (text === "/ringkasan") {
      await sendMessage(chatId, await getFinancialSummary(userId));
      return res.status(200).end();
    }

    if (text === "/transaksi") {
      await sendMessage(chatId, await getRecentTransactions(userId));
      return res.status(200).end();
    }

    if (text === "/analisis") {
      await sendMessage(chatId, "⏳ Sedang menganalisis data keuangan kamu\\.\\.\\.");
      const analysis = await getAIAnalysis(userId);
      for (const chunk of splitText(analysis, 4000)) await sendMessage(chatId, escapeMarkdown(chunk));
      return res.status(200).end();
    }

    if (text.startsWith("/tanya ")) {
      const question = text.replace("/tanya ", "").trim();
      if (!question) {
        await sendMessage(chatId, "❓ Contoh: `/tanya berapa pengeluaran bulan lalu\\?`");
        return res.status(200).end();
      }
      await sendMessage(chatId, "💭 Sedang mencari jawaban\\.\\.\\.");
      const answer = await getAIChat(userId, question);
      for (const chunk of splitText(answer, 4000)) await sendMessage(chatId, escapeMarkdown(chunk));
      return res.status(200).end();
    }

    if (text === "/input") {
      await startInputFlow(chatId, userId);
      return res.status(200).end();
    }

    // Pesan bebas → AI
    if (!text.startsWith("/")) {
      await sendMessage(chatId, "💭 Sedang memproses\\.\\.\\.");
      const answer = await getAIChat(userId, text);
      for (const chunk of splitText(answer, 4000)) await sendMessage(chatId, escapeMarkdown(chunk));
      return res.status(200).end();
    }

    await sendMessage(chatId, "❓ Perintah tidak dikenal\\. Ketik /help untuk melihat daftar perintah\\.");
    return res.status(200).end();

  } catch (error: any) {
    console.error("Telegram webhook error:", error?.message || error);
    return res.status(200).end();
  }
}

// Input Flow: Mulai 
async function startInputFlow(chatId: number, userId: string) {
  // Cek apakah user punya akun bank/wallet
  const [banks, wallets] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { ownerId: userId, isActive: true },
      select: { id: true, bankProvider: true, accountName: true },
    }),
    (prisma as any).digitalWallet.findMany({
      where: { ownerId: userId, isActive: true },
      select: { id: true, walletProvider: true, accountName: true },
    }),
  ]);

  const hasBanks = banks.length > 0;
  const hasWallets = wallets.length > 0;

  // Nomor pilihan dinamis berdasarkan akun yang tersedia
  let optionNum = 1;
  let msg = `➕ *Input Transaksi Baru*\n\nPilih sumber transaksi:\n\n`;
  if (hasBanks)   msg += `🏦 Ketik *${optionNum++}* — Rekening Bank\n`;
  if (hasWallets) msg += `💳 Ketik *${optionNum++}* — Dompet Digital \\(e\\-wallet\\)\n`;
  msg += `📝 Ketik *${optionNum}* — Catatan Cepat \\(tanpa akun\\)\n\n`;
  msg += `_Ketik /batal untuk membatalkan_`;

  // Simpan session
  setSession(chatId, { step: "CHOOSE_SOURCE", lastActivity: Date.now() });
  await sendMessage(chatId, msg);
}

// Input Flow: Handler setiap langkah 
async function handleInputFlow(chatId: number, userId: string, text: string, session: ConvState) {
  switch (session.step) {

    // Langkah 1: Pilih sumber 
    case "CHOOSE_SOURCE": {
      const [banks, wallets] = await Promise.all([
        prisma.bankAccount.findMany({
          where: { ownerId: userId, isActive: true },
          select: { id: true, bankProvider: true, accountName: true },
        }),
        (prisma as any).digitalWallet.findMany({
          where: { ownerId: userId, isActive: true },
          select: { id: true, walletProvider: true, accountName: true },
        }),
      ]);

      const hasBanks = banks.length > 0;
      const hasWallets = wallets.length > 0;

      // Hitung nomor pilihan dinamis — sama persis dengan yang ditampilkan di startInputFlow
      const bankOption   = hasBanks   ? 1                        : undefined;
      const walletOption = hasWallets ? (hasBanks ? 2 : 1)       : undefined;
      const manualOption = (hasBanks ? 1 : 0) + (hasWallets ? 1 : 0) + 1;

      const num = parseInt(text);

      if (bankOption !== undefined && num === bankOption) {
        if (banks.length === 1) {
          const b = banks[0];
          setSession(chatId, { ...session, step: "CHOOSE_TYPE", source: "BANK", accountId: b.id, accountLabel: `${b.bankProvider} — ${b.accountName}` });
          await askType(chatId, `${b.bankProvider} — ${b.accountName}`);
        } else {
          let msg = `🏦 *Pilih Rekening Bank:*\n\n`;
          banks.forEach((b: any, i: number) => { msg += `Ketik *${i + 1}* — ${b.bankProvider} \\| ${escMd(b.accountName)}\n`; });
          msg += `\n_Ketik /batal untuk membatalkan_`;
          setSession(chatId, { ...session, step: "CHOOSE_ACCOUNT", source: "BANK" });
          accountCache.set(chatId, banks);
          await sendMessage(chatId, msg);
        }
      } else if (walletOption !== undefined && num === walletOption) {
        if (wallets.length === 1) {
          const w = wallets[0];
          setSession(chatId, { ...session, step: "CHOOSE_TYPE", source: "WALLET", accountId: w.id, accountLabel: `${w.walletProvider} — ${w.accountName}` });
          await askType(chatId, `${w.walletProvider} — ${w.accountName}`);
        } else {
          let msg = `💳 *Pilih Dompet Digital:*\n\n`;
          wallets.forEach((w: any, i: number) => { msg += `Ketik *${i + 1}* — ${w.walletProvider} \\| ${escMd(w.accountName)}\n`; });
          msg += `\n_Ketik /batal untuk membatalkan_`;
          setSession(chatId, { ...session, step: "CHOOSE_ACCOUNT", source: "WALLET" });
          accountCache.set(chatId, wallets);
          await sendMessage(chatId, msg);
        }
      } else if (num === manualOption) {
        setSession(chatId, { ...session, step: "CHOOSE_TYPE", source: "MANUAL", accountId: undefined, accountLabel: "Catatan Cepat" });
        await askType(chatId, "Catatan Cepat");
      } else {
        await sendMessage(chatId, "⚠️ Pilihan tidak valid\\. Ketik angka yang tersedia atau /batal\\.");
      }
      break;
    }

    // Langkah 2: Pilih akun dari daftar 
    case "CHOOSE_ACCOUNT": {
      const accounts = accountCache.get(chatId) ?? [];
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= accounts.length) {
        await sendMessage(chatId, `⚠️ Pilih nomor 1 sampai ${accounts.length} atau /batal\\.`);
        return;
      }
      const acc = accounts[idx];
      const label = session.source === "BANK"
        ? `${acc.bankProvider} — ${acc.accountName}`
        : `${acc.walletProvider} — ${acc.accountName}`;
      accountCache.delete(chatId);
      setSession(chatId, { ...session, step: "CHOOSE_TYPE", accountId: acc.id, accountLabel: label });
      await askType(chatId, label);
      break;
    }

    // Langkah 3: Pilih tipe 
    case "CHOOSE_TYPE": {
      if (text === "1" || text.toUpperCase() === "MASUK" || text.toUpperCase() === "CREDIT") {
        setSession(chatId, { ...session, step: "INPUT_AMOUNT", type: "CREDIT" });
        await sendMessage(chatId, `💰 Berapa jumlah *pemasukan*\\?\n\nContoh: \`150000\` atau \`1500000\`\n\n_Ketik /batal untuk membatalkan_`);
      } else if (text === "2" || text.toUpperCase() === "KELUAR" || text.toUpperCase() === "DEBIT") {
        setSession(chatId, { ...session, step: "INPUT_AMOUNT", type: "DEBIT" });
        await sendMessage(chatId, `💸 Berapa jumlah *pengeluaran*\\?\n\nContoh: \`50000\` atau \`250000\`\n\n_Ketik /batal untuk membatalkan_`);
      } else {
        await sendMessage(chatId, "⚠️ Ketik *1* untuk Masuk atau *2* untuk Keluar\\.");
      }
      break;
    }

    // Langkah 4: Input nominal 
    case "INPUT_AMOUNT": {
      const raw = text.replace(/[.,\s]/g, "").replace(/[^0-9]/g, "");
      const amount = parseInt(raw);
      if (isNaN(amount) || amount <= 0) {
        await sendMessage(chatId, "⚠️ Nominal tidak valid\\. Masukkan angka saja, contoh: `50000`");
        return;
      }
      setSession(chatId, { ...session, step: "INPUT_DESCRIPTION", amount });
      await sendMessage(chatId, `📝 Deskripsi transaksi:\n\nContoh: _Gaji bulan Juli_, _Makan siang_, _Bayar tagihan listrik_\n\n_Ketik /batal untuk membatalkan_`);
      break;
    }

    // Langkah 5: Input deskripsi 
    case "INPUT_DESCRIPTION": {
      if (text.length < 2) {
        await sendMessage(chatId, "⚠️ Deskripsi terlalu pendek\\. Minimal 2 karakter\\.");
        return;
      }
      setSession(chatId, { ...session, step: "INPUT_DATE", description: text });
      await sendMessage(chatId,
        `📅 Tanggal transaksi \\(opsional\\):\n\n` +
        `Ketik tanggal format *DD\\-MM\\-YYYY*, contoh: \`24\\-07\\-2026\`\n` +
        `Atau ketik *sekarang* untuk tanggal hari ini\n\n` +
        `_Ketik /batal untuk membatalkan_`
      );
      break;
    }

    // Langkah 6: Input tanggal 
    case "INPUT_DATE": {
      let date: Date;
      const lower = text.toLowerCase().trim();

      if (lower === "sekarang" || lower === "today" || lower === "hari ini") {
        date = new Date();
        date.setHours(0, 0, 0, 0);
      } else {
        const parts = text.trim().split(/[-/]/);
        if (parts.length !== 3) {
          await sendMessage(chatId,
            "⚠️ Format tanggal salah\\.\n\n" +
            "Gunakan format *DD\\-MM\\-YYYY*\n" +
            "Contoh: `25\\-07\\-2026`\n\n" +
            "Atau ketik *sekarang* untuk tanggal hari ini\\."
          );
          return;
        }
        const [d, m, y] = parts.map(Number);
        if (isNaN(d) || isNaN(m) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31) {
          await sendMessage(chatId, "⚠️ Tanggal tidak valid\\. Gunakan format *DD\\-MM\\-YYYY*\\.");
          return;
        }
        date = new Date(y, m - 1, d);
        if (isNaN(date.getTime()) || y < 2000 || y > 2100) {
          await sendMessage(chatId, "⚠️ Tanggal tidak valid\\. Tahun harus antara 2000\\-2100\\.");
          return;
        }
      }

      const updatedSession: ConvState = { ...session, step: "CONFIRM", date };
      setSession(chatId, updatedSession);
      await showConfirmation(chatId, updatedSession);
      break;
    }

    // Langkah 7: Konfirmasi 
    case "CONFIRM": {
      if (text.toLowerCase() === "ya" || text === "1" || text.toLowerCase() === "yes") {
        clearSession(chatId);
        accountCache.delete(chatId);
        await sendMessage(chatId, "⏳ Menyimpan transaksi\\.\\.\\.");
        await saveTransaction(chatId, userId, session);
      } else if (text.toLowerCase() === "tidak" || text === "2" || text.toLowerCase() === "no") {
        clearSession(chatId);
        accountCache.delete(chatId);
        await sendMessage(chatId, "❌ Input dibatalkan\\. Ketik /input untuk mulai lagi\\.");
      } else {
        await sendMessage(chatId, "⚠️ Ketik *ya* untuk simpan atau *tidak* untuk batal\\.");
      }
      break;
    }
  }
}

// Cache sementara daftar akun saat user memilih dari list
const accountCache = new Map<number, any[]>();

async function askType(chatId: number, accountLabel: string) {
  await sendMessage(chatId,
    `✅ Akun: *${escMd(accountLabel)}*\n\n` +
    `Jenis transaksi:\n\n` +
    `Ketik *1* — 💰 Pemasukan \\(uang masuk\\)\n` +
    `Ketik *2* — 💸 Pengeluaran \\(uang keluar\\)\n\n` +
    `_Ketik /batal untuk membatalkan_`
  );
}

async function showConfirmation(chatId: number, s: ConvState) {
  const typeLabel = s.type === "CREDIT" ? "💰 Pemasukan" : "💸 Pengeluaran";
  const dateStr = s.date
    ? s.date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : "Hari ini";
  const sourceLabel = s.source === "MANUAL" ? "📝 Catatan Cepat" : s.source === "BANK" ? "🏦 Bank" : "💳 Wallet";
  const accountLabel = s.source === "MANUAL" ? "" : ` — ${escMd(s.accountLabel ?? "")}`;

  await sendMessage(chatId,
    `📋 *Konfirmasi Transaksi*\n\n` +
    `${sourceLabel}${accountLabel}\n` +
    `Jenis: ${typeLabel}\n` +
    `Nominal: *${escMd(fmt(s.amount ?? 0))}*\n` +
    `Deskripsi: ${escMd(s.description ?? "")}\n` +
    `Tanggal: ${escMd(dateStr)}\n\n` +
    `Ketik *ya* untuk simpan atau *tidak* untuk batal\\.`
  );
}

// Simpan transaksi ke database 
async function saveTransaction(chatId: number, userId: string, s: ConvState) {
  const db = prisma as any;
  const txDate = s.date ?? new Date();
  const amount = s.amount!;
  const description = s.description!;
  const type = s.type! as TransactionType;

  try {
    if (s.source === "BANK") {
      // Ambil info bank account untuk virtual upload placeholder
      const bank = await prisma.bankAccount.findUnique({
        where: { id: s.accountId },
        select: { bankProvider: true },
      });
      if (!bank) throw new Error("Rekening bank tidak ditemukan");

      // Cari atau buat virtual upload placeholder untuk input manual bot
      let upload = await prisma.bankStatementUpload.findFirst({
        where: { bankAccountId: s.accountId!, notes: "MANUAL_BOT_INPUT", status: UploadStatus.SUCCESS },
      });
      if (!upload) {
        upload = await prisma.bankStatementUpload.create({
          data: {
            bankAccountId: s.accountId!,
            uploadedById: userId,
            fileName: "manual-bot-input.csv",
            fileUrl: "manual://bot",
            fileFormat: FileFormat.CSV,
            bankProvider: bank.bankProvider as BankProvider,
            periodStart: new Date(2000, 0, 1),
            periodEnd: new Date(2099, 11, 31),
            status: UploadStatus.SUCCESS,
            notes: "MANUAL_BOT_INPUT",
          },
        });
      }

      const hash = crypto.createHash("md5")
        .update(`${s.accountId}|${txDate.toISOString()}|${amount}|BOT|${Date.now()}`)
        .digest("hex");

      await prisma.bankTransaction.create({
        data: {
          bankAccountId: s.accountId!,
          uploadId: upload.id,
          transactionDate: txDate,
          description,
          amount,
          type,
          status: EStatementStatus.VERIFIED,
          hash,
        },
      });

    } else if (s.source === "WALLET") {
      const wallet = await db.digitalWallet.findUnique({
        where: { id: s.accountId },
        select: { walletProvider: true },
      });
      if (!wallet) throw new Error("Dompet digital tidak ditemukan");

      let upload = await db.walletStatementUpload.findFirst({
        where: { walletId: s.accountId!, notes: "MANUAL_BOT_INPUT", status: UploadStatus.SUCCESS },
      });
      if (!upload) {
        upload = await db.walletStatementUpload.create({
          data: {
            walletId: s.accountId!,
            uploadedById: userId,
            fileName: "manual-bot-input.csv",
            fileUrl: "manual://bot",
            fileFormat: FileFormat.CSV,
            walletProvider: wallet.walletProvider as WalletProvider,
            periodStart: new Date(2000, 0, 1),
            periodEnd: new Date(2099, 11, 31),
            status: UploadStatus.SUCCESS,
            notes: "MANUAL_BOT_INPUT",
          },
        });
      }

      const hash = crypto.createHash("md5")
        .update(`${s.accountId}|${txDate.toISOString()}|${amount}|BOT|${Date.now()}`)
        .digest("hex");

      await db.walletTransaction.create({
        data: {
          walletId: s.accountId!,
          uploadId: upload.id,
          transactionDate: txDate,
          description,
          amount,
          type,
          status: EStatementStatus.VERIFIED,
          hash,
        },
      });

    } else {
      // MANUAL / Catatan Cepat — simpan ke tabel ManualTransaction, bebas dari bank/wallet
      await db.manualTransaction.create({
        data: {
          userId,
          transactionDate: txDate,
          description,
          amount,
          type,
          source: "TELEGRAM",
        },
      });
    }

    const typeLabel = type === "CREDIT" ? "Pemasukan" : "Pengeluaran";
    const dateStr = txDate.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const amountStr = escMd(fmt(amount));
    const descStr = escMd(description);
    const dateEsc = escMd(dateStr);
    await sendMessage(chatId,
      `✅ *Transaksi berhasil disimpan\\!*\n\n` +
      `${type === "CREDIT" ? "💰" : "💸"} ${escMd(typeLabel)}: *${amountStr}*\n` +
      `📝 ${descStr}\n` +
      `📅 ${dateEsc}\n\n` +
      `_Ketik /ringkasan untuk melihat ringkasan keuangan_`
    );
  } catch (err: any) {
    console.error("saveTransaction error:", err?.message);
    await sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${escMd(err?.message ?? "Unknown error")}`);
  }
}

// Fungsi data keuangan 
async function getFinancialSummary(userId: string): Promise<string> {
  const db = prisma as any;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [bankTx, walletTx, bankTxLast, walletTxLast] = await Promise.all([
    prisma.bankTransaction.findMany({ where: { bankAccount: { ownerId: userId }, transactionDate: { gte: startOfMonth } }, select: { type: true, amount: true } }),
    db.walletTransaction.findMany({ where: { wallet: { ownerId: userId }, transactionDate: { gte: startOfMonth } }, select: { type: true, amount: true } }),
    prisma.bankTransaction.findMany({ where: { bankAccount: { ownerId: userId }, transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, select: { type: true, amount: true } }),
    db.walletTransaction.findMany({ where: { wallet: { ownerId: userId }, transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, select: { type: true, amount: true } }),
  ]);

  const calc = (txs: { type: string; amount: any }[]) => {
    let income = 0, expense = 0;
    for (const tx of txs) { if (tx.type === "CREDIT") income += Number(tx.amount); else expense += Number(tx.amount); }
    return { income, expense, net: income - expense };
  };

  const curr = calc([...bankTx, ...walletTx]);
  const last = calc([...bankTxLast, ...walletTxLast]);
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const lastMonthName = startOfLastMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const netEmoji = curr.net >= 0 ? "✅" : "⚠️";
  const incomeChange = last.income > 0 ? ((curr.income - last.income) / last.income * 100).toFixed(1) : null;
  const expenseChange = last.expense > 0 ? ((curr.expense - last.expense) / last.expense * 100).toFixed(1) : null;

  return (
    `📊 *Ringkasan Keuangan — ${escMd(monthName)}*\n\n` +
    `💰 Pemasukan: *${escMd(fmt(curr.income))}*` + (incomeChange ? ` _(${Number(incomeChange) >= 0 ? "\\+" : ""}${escMd(incomeChange)}% vs ${escMd(lastMonthName)})_` : "") + "\n" +
    `💸 Pengeluaran: *${escMd(fmt(curr.expense))}*` + (expenseChange ? ` _(${Number(expenseChange) >= 0 ? "\\+" : ""}${escMd(expenseChange)}% vs ${escMd(lastMonthName)})_` : "") + "\n" +
    `${netEmoji} Net Flow: *${escMd(fmt(curr.net))}*\n\n` +
    `_Ketik /transaksi untuk melihat transaksi terakhir_`
  );
}

async function getRecentTransactions(userId: string): Promise<string> {
  const db = prisma as any;
  const [bankTx, walletTx] = await Promise.all([
    prisma.bankTransaction.findMany({ where: { bankAccount: { ownerId: userId } }, select: { transactionDate: true, description: true, amount: true, type: true, bankAccount: { select: { bankProvider: true } } }, orderBy: { transactionDate: "desc" }, take: 5 }),
    db.walletTransaction.findMany({ where: { wallet: { ownerId: userId } }, select: { transactionDate: true, description: true, amount: true, type: true, wallet: { select: { walletProvider: true } } }, orderBy: { transactionDate: "desc" }, take: 5 }),
  ]);

  const all = [
    ...bankTx.map((t: any) => ({ ...t, source: t.bankAccount.bankProvider })),
    ...walletTx.map((t: any) => ({ ...t, source: t.wallet.walletProvider })),
  ].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()).slice(0, 5);

  if (all.length === 0) return "📋 Belum ada transaksi yang tercatat\\.";

  const rows = all.map((tx: any) => {
    const date = new Date(tx.transactionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    const emoji = tx.type === "CREDIT" ? "🟢" : "🔴";
    const sign = tx.type === "CREDIT" ? "\\+" : "\\-";
    const desc = tx.description.length > 25 ? tx.description.substring(0, 25) + "\\.\\.\\." : escMd(tx.description);
    return `${emoji} ${date} \\| ${sign}${escMd(fmt(Number(tx.amount)))} \\| ${desc}`;
  });

  return `📋 *5 Transaksi Terakhir*\n\n` + rows.join("\n");
}

async function buildFinancialContext(userId: string, monthsBack = 6): Promise<string> {
  const db = prisma as any;
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const [bankTx, walletTx, manualTx] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { bankAccount: { ownerId: userId }, transactionDate: { gte: startDate } },
      select: { transactionDate: true, description: true, amount: true, type: true, categories: { select: { category: { select: { name: true } } } }, bankAccount: { select: { bankProvider: true, accountName: true } } },
      orderBy: { transactionDate: "desc" },
    }),
    db.walletTransaction.findMany({
      where: { wallet: { ownerId: userId }, transactionDate: { gte: startDate } },
      select: { transactionDate: true, description: true, amount: true, type: true, categories: { select: { category: { select: { name: true } } } }, wallet: { select: { walletProvider: true, accountName: true } } },
      orderBy: { transactionDate: "desc" },
    }),
    db.manualTransaction.findMany({
      where: { userId, transactionDate: { gte: startDate } },
      select: { transactionDate: true, description: true, amount: true, type: true },
      orderBy: { transactionDate: "desc" },
    }),
  ]);

  const allTx = [
    ...bankTx.map((t: any) => ({ date: new Date(t.transactionDate), description: t.description, amount: Number(t.amount), type: t.type, categoryNames: t.categories.map((c: any) => c.category.name), source: `${t.bankAccount.bankProvider} (${t.bankAccount.accountName})` })),
    ...walletTx.map((t: any) => ({ date: new Date(t.transactionDate), description: t.description, amount: Number(t.amount), type: t.type, categoryNames: t.categories.map((c: any) => c.category.name), source: `${t.wallet.walletProvider} (${t.wallet.accountName})` })),
    ...manualTx.map((t: any) => ({ date: new Date(t.transactionDate), description: t.description, amount: Number(t.amount), type: t.type, categoryNames: [] as string[], source: "Catatan Manual" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const monthlyMap: Record<string, { income: number; expense: number; count: number }> = {};
  const categoryMap: Record<string, number> = {};
  let totalIncome = 0, totalExpense = 0;

  for (const tx of allTx) {
    const key = tx.date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0, count: 0 };
    if (tx.type === "CREDIT") { totalIncome += tx.amount; monthlyMap[key].income += tx.amount; }
    else { totalExpense += tx.amount; monthlyMap[key].expense += tx.amount; const cats = tx.categoryNames.length > 0 ? tx.categoryNames : ["Tidak Berkategori"]; for (const c of cats) categoryMap[c] = (categoryMap[c] ?? 0) + tx.amount; }
    monthlyMap[key].count++;
  }

  const monthlyLines = Object.entries(monthlyMap).map(([m, v]) => `  - ${m}: Masuk ${fmt(v.income)}, Keluar ${fmt(v.expense)}, Net ${fmt(v.income - v.expense)} (${v.count} tx)`).join("\n");
  const categoryLines = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, a]) => `  - ${c}: ${fmt(a)}`).join("\n");
  const recentLines = allTx.slice(0, 20).map((tx) => { const d = tx.date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); const cat = tx.categoryNames.length > 0 ? ` [${tx.categoryNames.join(", ")}]` : ""; return `  - ${d} | ${tx.type === "CREDIT" ? "+" : "-"}${fmt(tx.amount)}${cat} | ${tx.description} | via ${tx.source}`; }).join("\n");

  return (
    `=== DATA KEUANGAN (${monthsBack} BULAN TERAKHIR) ===\nHari ini: ${now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}\n\n` +
    `TOTAL: Masuk ${fmt(totalIncome)}, Keluar ${fmt(totalExpense)}, Net ${fmt(totalIncome - totalExpense)}, ${allTx.length} transaksi\n\n` +
    `PER BULAN:\n${monthlyLines || "  (kosong)"}\n\n` +
    (categoryLines ? `PER KATEGORI (pengeluaran):\n${categoryLines}\n\n` : "") +
    `20 TRANSAKSI TERAKHIR:\n${recentLines || "  (kosong)"}`
  );
}

async function getAIChat(userId: string, question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "❌ Gemini AI belum dikonfigurasi\\.";
  const context = await buildFinancialContext(userId, 6);
  const systemContext = `Kamu adalah asisten keuangan pribadi bernama Fin-Techno Bot. Jawab dalam Bahasa Indonesia yang jelas. Gunakan data berikut untuk menjawab secara spesifik dan akurat. Sertakan angka, tanggal, dan detail relevan.\n\n${context}`;
  const genAI = new GoogleGenerativeAI(apiKey);
  const chat = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).startChat({
    history: [
      { role: "user", parts: [{ text: systemContext }] },
      { role: "model", parts: [{ text: "Baik, saya sudah membaca data keuangan kamu. Siap menjawab!" }] },
    ],
  });
  return (await chat.sendMessage(question)).response.text();
}

async function getAIAnalysis(userId: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "❌ Gemini AI belum dikonfigurasi\\.";
  const context = await buildFinancialContext(userId, 6);
  const prompt = `Kamu adalah analis keuangan pribadi. Analisis mendalam dalam Bahasa Indonesia.\n\n${context}\n\nFormat:\n1. KONDISI KEUANGAN\n2. ANALISIS PENGELUARAN (kategori & bulan terboros)\n3. POLA & TREN\n4. REKOMENDASI (3-5 poin konkret)`;
  const genAI = new GoogleGenerativeAI(apiKey);
  return (await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent(prompt)).response.text();
}

// Helpers 
// Escape singkat untuk teks yang dimasukkan ke MarkdownV2
function escMd(text: string): string {
  return text.replace(/([_\[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

// Escape lengkap untuk teks yang dikembalikan AI (konten bebas)
function escapeMarkdown(text: string): string {
  return text.replace(/([_\[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) { chunks.push(text.slice(start, start + maxLen)); start += maxLen; }
  return chunks;
}
