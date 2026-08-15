/* eslint-disable @typescript-eslint/no-explicit-any */
// Endpoint yang didaftarkan ke Telegram sebagai webhook.
// Mendukung: ringkasan, transaksi, AI chat, analisis, dan INPUT TRANSAKSI (bank/wallet/manual)

import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fmtIDR as fmt } from "@lib/formatters";
import { sendMessage, answerCallbackQuery, removeKeyboard, TelegramUpdate } from "@lib/telegram";
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
  dupWarningShown?: boolean; // true setelah user lihat warning duplikat
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
  const cbq = update.callback_query;

  // Handle inline button click
  if (cbq) {
    const chatId = cbq.message.chat.id;
    const text = cbq.data;

    // Hapus tombol dari pesan sebelumnya supaya tidak bisa diklik ulang
    await removeKeyboard(chatId, cbq.message.message_id);
    // Hilangkan loading spinner di Telegram
    await answerCallbackQuery(cbq.id);

    try {
      const user = await (prisma as any).user.findUnique({ where: { telegramChatId: String(chatId) } });
      if (!user) {
        await sendMessage(chatId, "🔒 Akun belum terhubung\\. Buka halaman *Profil* di web dan klik *Hubungkan Telegram*\\.");
        return res.status(200).end();
      }

      if (text === "CANCEL") {
        clearSession(chatId);
        accountCache.delete(chatId);
        await sendMessage(chatId, "❌ Input dibatalkan\\. Ketik /help untuk melihat perintah\\.");
        return res.status(200).end();
      }

      const session = getSession(chatId);
      if (session) {
        await handleInputFlow(chatId, user.id, text, session);
      }
    } catch (error: any) {
      console.error("Telegram callback_query error:", error?.message || error);
    }
    return res.status(200).end();
  }

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
      await sendMessage(chatId,
        `📝 *Perhatian sebelum input transaksi*\n\n` +
        `Fitur ini hanya untuk mencatat transaksi *yang tidak ada di mutasi rekening*, seperti:\n\n` +
        `• 💵 Dapat atau keluar uang *cash*\n` +
        `• 🤝 Terima atau beri uang *tanpa transfer bank*\n` +
        `• 🧾 Pengeluaran harian yang *tidak terekam di rekening manapun*\n\n` +
        `⚠️ Jika transaksi sudah tercatat di mutasi rekening bank atau e\\-wallet kamu, *tidak perlu input di sini* karena akan terhitung dua kali\\.\n\n` +
        `Lanjut input transaksi\\?`
      );
      await startInputFlow(chatId, userId);
      return res.status(200).end();
    }

    // Pesan bebas → coba parse sebagai transaksi dulu, kalau bukan → AI chat
    if (!text.startsWith("/")) {
      await sendMessage(chatId, "💭 Sedang memproses\\.\\.\\.");
      const parsed = await tryParseTransactions(text);
      if (parsed && parsed.length > 0) {
        await saveAndConfirmTransactions(chatId, userId, parsed);
      } else {
        const answer = await getAIChat(userId, text);
        for (const chunk of splitText(answer, 4000)) await sendMessage(chatId, escapeMarkdown(chunk));
      }
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

  // Buat baris tombol sumber
  const buttons: { text: string; callback_data: string }[][] = [];
  if (hasBanks)   buttons.push([{ text: "🏦 Rekening Bank", callback_data: "SRC_BANK" }]);
  if (hasWallets) buttons.push([{ text: "💳 Dompet Digital (e-wallet)", callback_data: "SRC_WALLET" }]);
  buttons.push([{ text: "📝 Catatan Cepat (cash / tanpa rekening)", callback_data: "SRC_MANUAL" }]);
  buttons.push([{ text: "❌ Batal", callback_data: "CANCEL" }]);

  setSession(chatId, { step: "CHOOSE_SOURCE", lastActivity: Date.now() });
  await sendMessage(chatId,
    `➕ *Input Transaksi Baru*\n\nPilih sumber transaksi:`,
    buttons
  );
}

// Input Flow: Handler setiap langkah 
async function handleInputFlow(chatId: number, userId: string, text: string, session: ConvState) {

  // Helper: deteksi dan proses multi-transaksi dari step manapun
  async function tryHandleMultiTx(): Promise<boolean> {
    const looksLikeMultiple =
      text.includes("\n") ||
      /\b\w.+\b\d{3,}\b.*\b\w.+\b\d{3,}/.test(text);
    if (!looksLikeMultiple) return false;

    clearSession(chatId);
    accountCache.delete(chatId);
    await sendMessage(chatId, "🤖 Mendeteksi beberapa transaksi, memproses otomatis\\.\\.\\.");
    const parsed = await tryParseTransactions(text);
    if (parsed && parsed.length > 0) {
      await saveAndConfirmTransactions(chatId, userId, parsed);
    } else {
      await sendMessage(chatId,
        "⚠️ Tidak bisa mengenali transaksi dari teks tersebut\\.\n\n" +
        "Gunakan format: `deskripsi nominal` per baris\\.\n" +
        "Contoh:\n`makan siang 25000`\n`bensin 50000`\n\n" +
        "Atau ketik /input untuk input satu per satu\\."
      );
    }
    return true;
  }

  switch (session.step) {

    // Langkah 1: Pilih sumber 
    case "CHOOSE_SOURCE": {
      if (await tryHandleMultiTx()) return;

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

      if (text === "SRC_BANK") {
        if (banks.length === 0) {
          await sendMessage(chatId, "⚠️ Tidak ada rekening bank aktif\\.");
          return;
        }
        if (banks.length === 1) {
          const b = banks[0];
          setSession(chatId, { ...session, step: "CHOOSE_TYPE", source: "BANK", accountId: b.id, accountLabel: `${b.bankProvider} — ${b.accountName}` });
          await askType(chatId, `${b.bankProvider} — ${b.accountName}`);
        } else {
          const buttons = banks.map((b: any) => ([{
            text: `🏦 ${b.bankProvider} | ${b.accountName}`,
            callback_data: `ACC_${b.id}`,
          }]));
          buttons.push([{ text: "❌ Batal", callback_data: "CANCEL" }]);
          setSession(chatId, { ...session, step: "CHOOSE_ACCOUNT", source: "BANK" });
          accountCache.set(chatId, banks);
          await sendMessage(chatId, `🏦 *Pilih Rekening Bank:*`, buttons);
        }
      } else if (text === "SRC_WALLET") {
        if (wallets.length === 0) {
          await sendMessage(chatId, "⚠️ Tidak ada dompet digital aktif\\.");
          return;
        }
        if (wallets.length === 1) {
          const w = wallets[0];
          setSession(chatId, { ...session, step: "CHOOSE_TYPE", source: "WALLET", accountId: w.id, accountLabel: `${w.walletProvider} — ${w.accountName}` });
          await askType(chatId, `${w.walletProvider} — ${w.accountName}`);
        } else {
          const buttons = wallets.map((w: any) => ([{
            text: `💳 ${w.walletProvider} | ${w.accountName}`,
            callback_data: `ACC_${w.id}`,
          }]));
          buttons.push([{ text: "❌ Batal", callback_data: "CANCEL" }]);
          setSession(chatId, { ...session, step: "CHOOSE_ACCOUNT", source: "WALLET" });
          accountCache.set(chatId, wallets);
          await sendMessage(chatId, `💳 *Pilih Dompet Digital:*`, buttons);
        }
      } else if (text === "SRC_MANUAL") {
        setSession(chatId, { ...session, step: "CHOOSE_TYPE", source: "MANUAL", accountId: undefined, accountLabel: "Catatan Cepat" });
        await askType(chatId, "Catatan Cepat");
      } else {
        await sendMessage(chatId, "⚠️ Pilihan tidak valid\\. Ketik /input untuk mulai lagi\\.");
      }
      break;
    }

    // Langkah 2: Pilih akun dari daftar 
    case "CHOOSE_ACCOUNT": {
      if (await tryHandleMultiTx()) return;
      const accounts = accountCache.get(chatId) ?? [];
      if (!text.startsWith("ACC_")) {
        await sendMessage(chatId, `⚠️ Pilih salah satu rekening dari tombol di atas atau ketik /batal\\.`);
        return;
      }
      const accId = text.replace("ACC_", "");
      const acc = accounts.find((a: any) => a.id === accId);
      if (!acc) {
        await sendMessage(chatId, `⚠️ Rekening tidak ditemukan\\. Ketik /input untuk mulai lagi\\.`);
        return;
      }
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
      if (await tryHandleMultiTx()) return;
      if (text === "TYPE_CREDIT" || text.toUpperCase() === "MASUK" || text.toUpperCase() === "CREDIT") {
        setSession(chatId, { ...session, step: "INPUT_AMOUNT", type: "CREDIT" });
        await sendMessage(chatId, `💰 Berapa jumlah *pemasukan*\\?\n\nContoh: \`150000\` atau \`1500000\`\n\n_Ketik /batal untuk membatalkan_`);
      } else if (text === "TYPE_DEBIT" || text.toUpperCase() === "KELUAR" || text.toUpperCase() === "DEBIT") {
        setSession(chatId, { ...session, step: "INPUT_AMOUNT", type: "DEBIT" });
        await sendMessage(chatId, `💸 Berapa jumlah *pengeluaran*\\?\n\nContoh: \`50000\` atau \`250000\`\n\n_Ketik /batal untuk membatalkan_`);
      } else {
        await sendMessage(chatId, "⚠️ Pilih jenis transaksi dari tombol di atas\\.");
      }
      break;
    }

    // Langkah 4: Input nominal 
    case "INPUT_AMOUNT": {
      if (await tryHandleMultiTx()) return;

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
      if (await tryHandleMultiTx()) return;

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
      if (await tryHandleMultiTx()) return;

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

      // Cek duplikat sebelum tampilkan konfirmasi
      const dupCheck = await checkDuplicate(
        userId,
        updatedSession.source!,
        updatedSession.accountId,
        updatedSession.amount!,
        updatedSession.type!,
        date
      );

      if (dupCheck.isDuplicate) {
        // Tandai warning sudah ditampilkan, tapi tetap lanjutkan ke CONFIRM
        setSession(chatId, { ...updatedSession, dupWarningShown: true });
        const matchLines = dupCheck.matches.map(
          (m) => `• ${escMd(m.date)} \\| *${escMd(fmt(m.amount))}* \\| ${escMd(m.description)}`
        ).join("\n");
        const typeLabel = updatedSession.type === "CREDIT" ? "💰 Pemasukan" : "💸 Pengeluaran";
        const dateStr = date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
        await sendMessage(chatId,
          `⚠️ *Kemungkinan Transaksi Duplikat*\n\n` +
          `Ditemukan transaksi serupa di *${escMd(updatedSession.accountLabel ?? "")}*:\n\n` +
          `${matchLines}\n\n` +
          `─────────────────────\n` +
          `Transaksi yang mau kamu simpan:\n` +
          `${typeLabel}: *${escMd(fmt(updatedSession.amount!))}*\n` +
          `📝 ${escMd(updatedSession.description ?? "")}\n` +
          `📅 ${escMd(dateStr)}\n\n` +
          `Jika ini transaksi berbeda \\(misalnya beli sesuatu 2x di hari yang sama\\), pilih *Tetap Simpan*\\.\n` +
          `Jika sudah tercatat dari mutasi rekening, pilih *Batalkan*\\.`,
          [
            [
              { text: "✅ Tetap Simpan", callback_data: "CONFIRM_YES" },
              { text: "❌ Batalkan", callback_data: "CONFIRM_NO" },
            ],
          ]
        );
        return;
      }

      await showConfirmation(chatId, updatedSession);
      break;
    }

    // Langkah 7: Konfirmasi 
    case "CONFIRM": {
      if (text === "CONFIRM_YES" || text.toLowerCase() === "ya" || text.toLowerCase() === "yes") {
        clearSession(chatId);
        accountCache.delete(chatId);
        await sendMessage(chatId, "⏳ Menyimpan transaksi\\.\\.\\.");
        await saveTransaction(chatId, userId, session);
      } else if (text === "CONFIRM_NO" || text.toLowerCase() === "tidak" || text.toLowerCase() === "no") {
        clearSession(chatId);
        accountCache.delete(chatId);
        await sendMessage(chatId, "❌ Input dibatalkan\\. Ketik /input untuk mulai lagi\\.");
      } else {
        const hint = session.dupWarningShown
          ? "⚠️ Pilih *Tetap Simpan* atau *Batalkan* dari tombol di atas\\."
          : "⚠️ Pilih *Ya, Simpan* atau *Batal* dari tombol di atas\\.";
        await sendMessage(chatId, hint);
      }
      break;
    }
  }
}

// Cache sementara daftar akun saat user memilih dari list
const accountCache = new Map<number, any[]>();

//  Cek Duplikat Transaksi
// Cek apakah transaksi dengan nominal + tanggal yang sama (±3 hari) sudah ada
// di rekening bank atau wallet yang dipilih user.
// Untuk sumber MANUAL/Catatan Cepat tidak dicek karena memang di luar mutasi.
async function checkDuplicate(
  _userId: string,
  source: "BANK" | "WALLET" | "MANUAL",
  accountId: string | undefined,
  amount: number,
  type: "CREDIT" | "DEBIT",
  date: Date
): Promise<{ isDuplicate: boolean; matches: { date: string; description: string; amount: number }[] }> {
  // Transaksi cash/manual tidak perlu dicek
  if (source === "MANUAL" || !accountId) return { isDuplicate: false, matches: [] };

  // Window ±3 hari untuk toleransi perbedaan tanggal pencatatan
  const dayStart = new Date(date);
  dayStart.setDate(dayStart.getDate() - 3);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setDate(dayEnd.getDate() + 3);
  dayEnd.setHours(23, 59, 59, 999);

  // Toleransi nominal ±1% untuk antisipasi perbedaan kecil (misal fee, pembulatan)
  const amountMin = Math.floor(amount * 0.99);
  const amountMax = Math.ceil(amount * 1.01);

  if (source === "BANK") {
    const existing = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId: accountId,
        type: type as TransactionType,
        transactionDate: { gte: dayStart, lte: dayEnd },
        amount: { gte: amountMin, lte: amountMax },
      },
      select: { transactionDate: true, description: true, amount: true },
      take: 3,
    });

    if (existing.length > 0) {
      return {
        isDuplicate: true,
        matches: existing.map((t) => ({
          date: new Date(t.transactionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
          description: t.description,
          amount: Number(t.amount),
        })),
      };
    }
  } else if (source === "WALLET") {
    const db = prisma as any;
    const existing = await db.walletTransaction.findMany({
      where: {
        walletId: accountId,
        type,
        transactionDate: { gte: dayStart, lte: dayEnd },
        amount: { gte: amountMin, lte: amountMax },
      },
      select: { transactionDate: true, description: true, amount: true },
      take: 3,
    });

    if (existing.length > 0) {
      return {
        isDuplicate: true,
        matches: existing.map((t: any) => ({
          date: new Date(t.transactionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
          description: t.description,
          amount: Number(t.amount),
        })),
      };
    }
  }

  return { isDuplicate: false, matches: [] };
}

async function askType(chatId: number, accountLabel: string) {
  await sendMessage(chatId,
    `✅ Akun: *${escMd(accountLabel)}*\n\nJenis transaksi:`,
    [
      [
        { text: "💰 Pemasukan (uang masuk)", callback_data: "TYPE_CREDIT" },
      ],
      [
        { text: "💸 Pengeluaran (uang keluar)", callback_data: "TYPE_DEBIT" },
      ],
      [{ text: "❌ Batal", callback_data: "CANCEL" }],
    ]
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
    `Simpan transaksi ini\\?`,
    [
      [
        { text: "✅ Ya, Simpan", callback_data: "CONFIRM_YES" },
        { text: "❌ Batal", callback_data: "CONFIRM_NO" },
      ],
    ]
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

//  AI Parse Transaksi dari Teks Bebas 

interface ParsedTx {
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  date?: string; // ISO date string YYYY-MM-DD, opsional — jika tidak ada pakai waktu saat ini
  time?: string; // HH:MM:SS format, opsional — jika tidak ada pakai jam saat ini
}

// Kirim teks ke Gemini, minta ekstrak transaksi dalam JSON.
// Return null jika teks bukan input transaksi (pertanyaan, obrolan, dll).
async function tryParseTransactions(text: string): Promise<ParsedTx[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const today = new Date().toISOString().split("T")[0];
  const prompt =
    `Kamu adalah parser transaksi keuangan. Tugasmu HANYA mengekstrak transaksi dari teks.\n\n` +
    `Hari ini: ${today}\n\n` +
    `Teks dari user:\n"${text}"\n\n` +
    `INSTRUKSI:\n` +
    `1. Jika teks berisi satu atau lebih transaksi keuangan (ada nominal uang + deskripsi), ` +
    `ekstrak dan kembalikan JSON array dengan format:\n` +
    `[{"description":"...","amount":50000,"type":"DEBIT","date":"YYYY-MM-DD","time":"HH:MM"}]\n` +
    `2. type: "CREDIT" untuk uang masuk (gaji, transfer masuk, terima, dapat), ` +
    `"DEBIT" untuk uang keluar (beli, bayar, makan, belanja, transfer keluar, dll)\n` +
    `3. Untuk tanggal relatif: "hari ini"="${today}", "kemarin"=kemarin, "tadi"="${today}", ` +
    `"minggu lalu"=7 hari lalu. Jika tidak ada info tanggal sama sekali, hilangkan field "date" dari objek JSON.\n` +
    `4. Nominal: "5jt"=5000000, "50rb"=50000, "1.5jt"=1500000, "25k"=25000\n` +
    `5. Untuk field "time": ekstrak jam jika ada. Format output: "H" jika hanya ada jam (contoh: "jam 8"="8"), ` +
    `"H:MM" jika ada jam+menit (contoh: "jam 8:30"="8:30"), ` +
    `"H:MM:SS" jika ada jam+menit+detik (contoh: "08:30:45"="8:30:45"). ` +
    `Konversi waktu: "jam 3 sore"="15", "jam 8 pagi"="8", "jam 9 malam"="21", "siang"="12", "tengah malam"="0". ` +
    `Jika tidak ada info jam sama sekali, hilangkan field "time" dari objek JSON.\n` +
    `6. Jika teks adalah pertanyaan, obrolan, atau TIDAK mengandung transaksi → kembalikan: []\n` +
    `7. Kembalikan HANYA JSON array, tanpa penjelasan, tanpa markdown code block.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Bersihkan jika ada code block
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const arr = JSON.parse(cleaned);

    if (!Array.isArray(arr) || arr.length === 0) return null;

    // Validasi setiap item
    const valid: ParsedTx[] = arr.filter((item: any) =>
      typeof item.description === "string" &&
      typeof item.amount === "number" && item.amount > 0 &&
      (item.type === "CREDIT" || item.type === "DEBIT") &&
      typeof item.date === "string"
    );

    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

// Simpan array transaksi hasil parse AI dan kirim konfirmasi ke user
async function saveAndConfirmTransactions(chatId: number, userId: string, txs: ParsedTx[]) {
  const db = prisma as any;
  const saved: ParsedTx[] = [];
  const failed: string[] = [];

  for (const tx of txs) {
    try {
      // Jika date tidak ada/kosong → gunakan tanggal hari ini
      // Jika time tidak ada → gunakan jam saat ini
      const now = new Date();
      const txDate = (tx.date && tx.date !== "null")
        ? new Date(tx.date as string)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (isNaN(txDate.getTime())) txDate.setTime(now.getTime());

      // Terapkan jam jika ada — mendukung format: "H", "H:MM", "H:MM:SS"
      // Jika tidak ada info jam → pakai jam:menit:detik saat ini
      if (tx.time && tx.time !== "null") {
        const parts = tx.time.split(":").map(Number);
        const h = parts[0] ?? 0;
        const m = parts[1] ?? 0;
        const s = parts[2] ?? 0;
        if (!isNaN(h) && h >= 0 && h <= 23 &&
            !isNaN(m) && m >= 0 && m <= 59 &&
            !isNaN(s) && s >= 0 && s <= 59) {
          txDate.setHours(h, m, s, 0);
        }
      } else {
        txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      }

      await db.manualTransaction.create({
        data: {
          userId,
          transactionDate: txDate,
          description: tx.description,
          amount: tx.amount,
          type: tx.type as TransactionType,
          source: "TELEGRAM",
        },
      });
      saved.push(tx);
    } catch {
      failed.push(tx.description);
    }
  }

  if (saved.length === 0) {
    await sendMessage(chatId, "❌ Gagal menyimpan transaksi\\. Coba lagi atau gunakan /input\\.");
    return;
  }

  // Buat pesan konfirmasi ringkasan
  const lines = saved.map((tx) => {
    const emoji = tx.type === "CREDIT" ? "🟢" : "🔴";
    const sign = tx.type === "CREDIT" ? "\\+" : "\\-";
    const dateStr = new Date(tx.date ?? new Date()).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    return `${emoji} ${escMd(dateStr)} \\| ${sign}${escMd(fmt(tx.amount))} \\| ${escMd(tx.description)}`;
  });

  let msg = `✅ *${saved.length} transaksi berhasil disimpan\\!*\n\n` + lines.join("\n");
  if (failed.length > 0) {
    msg += `\n\n⚠️ Gagal: ${failed.map(escMd).join(", ")}`;
  }
  msg += `\n\n_Ketik /ringkasan untuk melihat ringkasan keuangan_`;

  await sendMessage(chatId, msg);
}

// Fungsi data keuangan 
async function getFinancialSummary(userId: string): Promise<string> {
  const db = prisma as any;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [bankTx, walletTx, manualTx, bankTxLast, walletTxLast, manualTxLast] = await Promise.all([
    prisma.bankTransaction.findMany({ where: { bankAccount: { ownerId: userId }, transactionDate: { gte: startOfMonth } }, select: { type: true, amount: true } }),
    db.walletTransaction.findMany({ where: { wallet: { ownerId: userId }, transactionDate: { gte: startOfMonth } }, select: { type: true, amount: true } }),
    db.manualTransaction.findMany({ where: { userId, transactionDate: { gte: startOfMonth } }, select: { type: true, amount: true } }),
    prisma.bankTransaction.findMany({ where: { bankAccount: { ownerId: userId }, transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, select: { type: true, amount: true } }),
    db.walletTransaction.findMany({ where: { wallet: { ownerId: userId }, transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, select: { type: true, amount: true } }),
    db.manualTransaction.findMany({ where: { userId, transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, select: { type: true, amount: true } }),
  ]);

  const calc = (txs: { type: string; amount: any }[]) => {
    let income = 0, expense = 0;
    for (const tx of txs) { if (tx.type === "CREDIT") income += Number(tx.amount); else expense += Number(tx.amount); }
    return { income, expense, net: income - expense };
  };

  const curr = calc([...bankTx, ...walletTx, ...manualTx]);
  const last = calc([...bankTxLast, ...walletTxLast, ...manualTxLast]);
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
