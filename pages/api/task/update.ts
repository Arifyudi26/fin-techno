/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { TaskRequestBody } from "@/lib/types";
import { TaskStatus } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = verifyToken(req);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { taskId, status, title, description, assigneeId }: TaskRequestBody =
      req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Task ID is required" });
    }

    const existingTask = await db.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const logs: {
      action: string;
      note: string;
      oldStatus: TaskStatus | null;
      newStatus: TaskStatus | null;
    }[] = [];
    const updateData: any = {};

    const oldStatus = existingTask.status as TaskStatus;
    let newStatus = oldStatus;

    // Update status
    if (status && status !== existingTask.status) {
      updateData.status = status;
      newStatus = status as TaskStatus;
      logs.push({
        action: "Status Updated",
        note: `Task "${existingTask.title}" (ID: ${taskId}) status changed from "${oldStatus}" to "${newStatus}" by ${user.name}.`, // Fallback to user.id if name is undefined
        oldStatus,
        newStatus,
      });
    }

    // Update title
    if (title && title !== existingTask.title) {
      updateData.title = title;
      logs.push({
        action: "Title Updated",
        note: `Task "${existingTask.title}" (ID: ${taskId}) title changed from "${existingTask.title}" to "${title}" by ${user.name}.`, // Fallback to user.id if name is undefined
        oldStatus,
        newStatus,
      });
    }

    // Update description
    if (description && description !== existingTask.description) {
      updateData.description = description;
      logs.push({
        action: "Description Updated",
        note: `Task "${existingTask.title}" (ID: ${taskId}) description changed from "${existingTask.description}" to "${description}" by ${user.name}.`, // Fallback to user.id if name is undefined
        oldStatus,
        newStatus,
      });
    }

    // Update assignee
    if (assigneeId) {
      const previousAssigneeRecord = await db.taskAssignee.findFirst({
        where: { taskId },
        select: { userId: true },
      });

      const previousAssignee = previousAssigneeRecord
        ? await db.user.findUnique({
            where: { id: previousAssigneeRecord.userId },
            select: { name: true },
          })
        : null;

      const newAssignee = await db.user.findUnique({
        where: { id: assigneeId },
        select: { name: true },
      });

      await db.taskAssignee.deleteMany({
        where: { taskId },
      });

      await db.taskAssignee.create({
        data: {
          taskId,
          userId: assigneeId,
        },
      });

      logs.push({
        action: "Assignee Updated",
        note: `Task "${
          existingTask.title
        }" (ID: ${taskId}) assignee changed from "${
          previousAssignee?.name ?? "None"
        }" to "${newAssignee?.name ?? "Unknown"}" by ${user.name}.`,
        oldStatus,
        newStatus,
      });
    }

    if (Object.keys(updateData).length === 0 && logs.length === 0) {
      return res.status(200).json({ message: "No changes detected" });
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    if (logs.length > 0) {
      await db.taskLog.createMany({
        data: logs.map((log) => ({
          taskId,
          userId: user.id,
          action: log.action,
          note: log.note,
          oldStatus: log.oldStatus,
          newStatus: log.newStatus,
        })),
      });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
