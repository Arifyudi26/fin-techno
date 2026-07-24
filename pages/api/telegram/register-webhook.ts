/**
 * POST /api/telegram/register-webhook
 *
 * Daftarkan webhook URL ke Telegram.
 * Panggil endpoint ini SEKALI setelah deploy ke Vercel.
 * Hanya bisa diakses oleh admin.
 */

import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@lib/auth";
import { setWebhook } from "@lib/telegram";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Hanya admin yang bisa register webhook
  let decoded;
  try {
    decoded = verifyToken(req);
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (decoded.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin only" });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(503).json({ message: "TELEGRAM_BOT_TOKEN is not configured" });
  }

  // URL webhook harus berupa HTTPS public URL
  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") ||
    req.headers.origin;

  if (!appUrl) {
    return res.status(400).json({ message: "Cannot determine app URL. Set NEXTAUTH_URL env var." });
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  const result = await setWebhook(webhookUrl);

  return res.status(200).json({
    webhookUrl,
    telegramResponse: result,
  });
}
