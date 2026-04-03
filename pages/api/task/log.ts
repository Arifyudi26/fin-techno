import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { Log } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token is required" });
  }

  try {
    const logs = await db.taskLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
      },
    });

    const formattedLogs: Log[] = logs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      user: {
        email: log.user.email,
      },
      note: log.note || undefined,
      oldStatus: log.oldStatus || undefined,
      newStatus: log.newStatus || undefined,
    }));

    res.status(200).json({
      message: "success",
      data: formattedLogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving logs" });
  }
}
