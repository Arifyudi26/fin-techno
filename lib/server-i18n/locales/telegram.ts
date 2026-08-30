export const telegram = {
  id: {
    telegramDisconnected: "Telegram terputus",
    telegramBotTokenMissing: "TELEGRAM_BOT_TOKEN belum dikonfigurasi di environment variables.",
    appUrlUndetermined: "Tidak dapat menentukan URL aplikasi. Set env NEXTAUTH_URL.",
    webhookHttpsOnly: "Webhook hanya bisa didaftarkan ke URL HTTPS production. Set NEXTAUTH_URL di env.",
  },
  en: {
    telegramDisconnected: "Telegram disconnected",
    telegramBotTokenMissing: "TELEGRAM_BOT_TOKEN is not configured in environment variables.",
    appUrlUndetermined: "Cannot determine app URL. Set NEXTAUTH_URL env var.",
    webhookHttpsOnly: "Webhook can only be registered to a production HTTPS URL. Set NEXTAUTH_URL in env.",
  },
} as const;
