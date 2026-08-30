import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: st(req, "unauthorized") }); }

  // GET — fetch notifications (single query with unread count)
  if (req.method === "GET") {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    return res.status(200).json({ notifications, unreadCount });
  }

  // POST — create notification
  if (req.method === "POST") {
    const { type, title, message, fileName } = req.body;
    if (!type || !title || !message) return res.status(400).json({ message: st(req, "notificationRequiredFields") });
    const notif = await prisma.notification.create({
      data: { userId, type, title, message, fileName: fileName ?? null },
    });
    return res.status(201).json(notif);
  }

  // PATCH — mark all as read
  if (req.method === "PATCH") {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return res.status(200).json({ ok: true });
  }

  // DELETE — clear all
  if (req.method === "DELETE") {
    await prisma.notification.deleteMany({ where: { userId } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
