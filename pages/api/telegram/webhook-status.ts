// Endpoint khusus admin untuk cek dan daftarkan webhook ke Telegram
// GET  - lihat status webhook yang aktif
// POST - daftarkan atau update URL webhook

import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@lib/auth";
import { setWebhook } from "@lib/telegram";
import { st } from "@lib/server-i18n";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let decoded;
  try {
    decoded = verifyToken(req);
  } catch {
    return res.status(401).json({ message: st(req, "unauthorized") });
  }

  if (decoded.role !== "admin") {
    return res.status(403).json({ message: st(req, "forbiddenAdminOnly") });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(503).json({ message: st(req, "telegramBotTokenMissing") });
  }

  if (req.method === "GET") {
    const tgRes = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await tgRes.json();

    const info = data.result ?? {};
    const isRegistered = !!info.url && info.url.includes("/api/telegram/webhook");

    return res.status(200).json({
      isRegistered,
      webhookUrl: info.url || null,
      pendingUpdateCount: info.pending_update_count ?? 0,
      lastErrorDate: info.last_error_date ?? null,
      lastErrorMessage: info.last_error_message ?? null,
      botToken: process.env.TELEGRAM_BOT_TOKEN ? "configured" : "missing",
    });
  }

  if (req.method === "POST") {
    // Ambil base URL dari env, tidak bisa pakai localhost
    const appUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") ||
      `https://${req.headers.host}`;

    if (!appUrl || appUrl.startsWith("http://localhost")) {
      return res.status(400).json({
        message: st(req, "webhookHttpsOnly"),
      });
    }

    const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
    const result = await setWebhook(webhookUrl);

    return res.status(200).json({
      webhookUrl,
      telegramResponse: result,
      success: result?.ok === true,
    });
  }

  return res.status(405).end();
}
