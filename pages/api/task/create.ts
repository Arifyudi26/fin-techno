import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { JwtPayload } from "jsonwebtoken";

interface CustomJwtPayload extends JwtPayload {
  id: string;
  role: "USER" | "ADMIN";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const user = verifyToken(req) as CustomJwtPayload;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { title, description = "", assigneeId } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = await db.task.create({
      data: { title, description, createdBy: user.id },
    });

    if (assigneeId) {
      await db.taskAssignee.create({
        data: {
          taskId: task.id,
          userId: assigneeId,
        },
      });
    }

    const admin = await db.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    await db.taskLog.create({
      data: {
        taskId: task.id,
        userId: user.id,
        action: "Task Created",
        newStatus: task.status,
        note: `Task '${title}' was created by Admin ${admin?.name}. Initial status: '${task.status}'.`,
      },
    });

    res.status(201).json({ message: "success", data: task });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
