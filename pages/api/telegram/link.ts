/* eslint-disable @typescript-eslint/no-explicit-any */
// Endpoint untuk link/unlink akun user ke Telegram bot
// GET    - cek status koneksi
// POST   - generate token untuk link akun
// DELETE - putuskan koneksi

import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, telegramLinkToken: true },
    });

    return res.status(200).json({
      connected: !!user?.telegramChatId,
      chatId: user?.telegramChatId ?? null,
      hasPendingToken: !!user?.telegramLinkToken,
    });
  }

  if (req.method === "POST") {
    const token = crypto.randomBytes(16).toString("hex");

    await (prisma as any).user.update({
      where: { id: userId },
      data: { telegramLinkToken: token },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "your_bot";
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return res.status(200).json({ token, deepLink });
  }

  if (req.method === "DELETE") {
    await (prisma as any).user.update({
      where: { id: userId },
      data: { telegramChatId: null, telegramLinkToken: null },
    });

    return res.status(200).json({ message: "Telegram disconnected" });
  }

  return res.status(405).end();
}
