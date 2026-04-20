import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export const config = { maxDuration: 25 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let closed = false;

  const sendSnapshot = async () => {
    if (closed) return;
    try {
      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.notification.count({ where: { userId, read: false } }),
      ]);
      if (!closed) res.write(`data: ${JSON.stringify({ notifications, unreadCount })}\n\n`);
    } catch {
      // DB error — skip tick
    }
  };

  await sendSnapshot();

  const interval = setInterval(sendSnapshot, 8_000);
  // Heartbeat keeps connection alive through proxies/Vercel
  const heartbeat = setInterval(() => {
    if (!closed) res.write(": ping\n\n");
  }, 15_000);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);
    clearInterval(heartbeat);
    res.end();
  });
}
