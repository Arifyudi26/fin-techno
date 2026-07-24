"use client";

//  TelegramConnect — kartu untuk menghubungkan / memutuskan akun ke Telegram bot.
//  Tempatkan di halaman /profile di bawah kartu profil lainnya.
 
import { useEffect, useState } from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";

interface LinkStatus {
  connected: boolean;
  chatId: string | null;
}

interface WebhookStatus {
  isRegistered: boolean;
  webhookUrl: string | null;
  pendingUpdateCount: number;
  botToken: string;
}

export default function TelegramConnect() {
  const { role } = useAuthStore();
  const isAdmin = role === "admin";
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Ambil status koneksi saat mount
  useEffect(() => {
    const fetchStatusOnce = async () => {
      try {
        const res = await axiosGlobal.get("/telegram/link");
        setStatus(res.data);
      } catch { /* ignore */ }
    };

    const fetchWebhookOnce = async () => {
      try {
        const res = await axiosGlobal.get("/telegram/webhook-status");
        setWebhookStatus(res.data);
      } catch { /* ignore */ }
    };

    fetchStatusOnce();
    if (isAdmin) fetchWebhookOnce();
  }, [isAdmin]);

  async function fetchStatus() {
    try {
      const res = await axiosGlobal.get("/telegram/link");
      setStatus(res.data);
    } catch {
      // ignore
    }
  }

  async function fetchWebhookStatus() {
    try {
      const res = await axiosGlobal.get("/telegram/webhook-status");
      setWebhookStatus(res.data);
    } catch {
      // ignore
    }
  }

  async function handleRegisterWebhook() {
    if (!confirm("Daftarkan webhook ke Telegram? Pastikan TELEGRAM_BOT_TOKEN dan NEXTAUTH_URL sudah benar.")) return;
    setRegistering(true);
    setMessage(null);
    try {
      const res = await axiosGlobal.post("/telegram/webhook-status", {});
      if (res.data.success) {
        setMessage({ type: "success", text: "✅ Webhook berhasil didaftarkan ke Telegram!" });
        fetchWebhookStatus();
      } else {
        setMessage({
          type: "error",
          text: `❌ Gagal: ${res.data.telegramResponse?.description || "Unknown error"}`,
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Gagal mendaftarkan webhook.",
      });
    } finally {
      setRegistering(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    setDeepLink(null);
    try {
      const res = await axiosGlobal.post("/telegram/link", {});
      setDeepLink(res.data.deepLink);
    } catch {
      setMessage({ type: "error", text: "Gagal membuat link. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Putuskan koneksi Telegram dari akun ini?")) return;
    setLoading(true);
    setMessage(null);
    try {
      await axiosGlobal.delete("/telegram/link");
      setStatus({ connected: false, chatId: null });
      setDeepLink(null);
      setMessage({ type: "success", text: "Telegram berhasil diputuskan." });
    } catch {
      setMessage({ type: "error", text: "Gagal memutuskan koneksi." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Admin section: Webhook registration */}
      {isAdmin && (
        <div className="p-5 border-2 border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 rounded-2xl lg:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-amber-900 dark:text-amber-200 mb-1">
                Panel Administrator — Webhook Telegram
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300/80">
                Webhook harus didaftarkan sekali sebelum bot bisa menerima pesan dari Telegram.
              </p>
            </div>
          </div>

          {/* Webhook status */}
          {webhookStatus ? (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 rounded-xl">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Webhook</span>
                {webhookStatus.isRegistered ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Terdaftar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Belum terdaftar
                  </span>
                )}
              </div>

              {webhookStatus.webhookUrl && (
                <div className="p-3 bg-white dark:bg-gray-900/50 rounded-xl">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Webhook URL</span>
                  <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                    {webhookStatus.webhookUrl}
                  </code>
                </div>
              )}

              {webhookStatus.pendingUpdateCount > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    {webhookStatus.pendingUpdateCount} pesan tertunda
                  </span>
                </div>
              )}

              <div className="p-3 bg-white dark:bg-gray-900/50 rounded-xl">
                <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bot Token</span>
                <span className={`text-xs font-medium ${
                  webhookStatus.botToken === "configured"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {webhookStatus.botToken === "configured" ? "✓ Configured" : "✗ Missing"}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-white dark:bg-gray-900/50 rounded-xl">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex gap-3">
            <button
              onClick={handleRegisterWebhook}
              disabled={registering || !webhookStatus || webhookStatus.botToken !== "configured"}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {registering ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Mendaftarkan...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {webhookStatus?.isRegistered ? "Re-register Webhook" : "Daftarkan Webhook"}
                </>
              )}
            </button>
            <button
              onClick={fetchWebhookStatus}
              disabled={registering}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-xl hover:bg-amber-50 dark:bg-gray-800 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {webhookStatus?.botToken !== "configured" && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-xs text-red-700 dark:text-red-300">
                ⚠️ TELEGRAM_BOT_TOKEN belum dikonfigurasi di environment variables. Webhook tidak bisa didaftarkan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* User section: Connect account */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {/* Telegram icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-sky-500" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Telegram Bot
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Akses data keuangan & AI asisten langsung dari Telegram
          </p>
        </div>
        {/* Badge status */}
        <div className="ml-auto">
          {status?.connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Terhubung
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Belum terhubung
            </span>
          )}
        </div>
      </div>

      {/* Fitur bot */}
      {!status?.connected && (
        <div className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-4">
          {[
            { icon: "📊", label: "Ringkasan bulanan" },
            { icon: "📋", label: "Transaksi terakhir" },
            { icon: "💬", label: "Tanya ke AI" },
            { icon: "🔍", label: "Analisis keuangan" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1 p-3 text-center bg-gray-50 rounded-xl dark:bg-gray-800/50"
            >
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{f.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pesan feedback */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : message.type === "warning"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Deep link setelah generate */}
      {deepLink && (
        <div className="mb-4 p-4 bg-sky-50 rounded-xl dark:bg-sky-900/20">
          <p className="mb-3 text-sm font-medium text-sky-800 dark:text-sky-300">
            Klik tombol di bawah untuk membuka Telegram dan menghubungkan akun:
          </p>
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-xl hover:bg-sky-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Buka di Telegram
          </a>
          <p className="mt-2 text-xs text-sky-600 dark:text-sky-400">
            Link hanya berlaku sekali. Refresh halaman jika sudah terhubung.
          </p>
        </div>
      )}

      {/* Aksi */}
      <div className="flex flex-wrap gap-3">
        {status?.connected ? (
          <>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Refresh Status
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Putuskan Koneksi"}
            </button>
          </>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-sky-500 rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            {loading ? (
              "Membuat link..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Hubungkan Telegram
              </>
            )}
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
