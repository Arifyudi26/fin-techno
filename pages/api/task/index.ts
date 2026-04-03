/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { TaskStatus } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token is required" });
  }

  try {
    const fetchTasks = async (status: TaskStatus) => {
      return await db.task.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        include: {
          creator: true,
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    };

    const [notStartedTasks, onProgressTasks, doneTasks, rejectTasks] =
      await Promise.all([
        fetchTasks(TaskStatus.NOT_STARTED),
        fetchTasks(TaskStatus.ON_PROGRESS),
        fetchTasks(TaskStatus.DONE),
        fetchTasks(TaskStatus.REJECT),
      ]);

    const formatTasks = (tasks: any[]) =>
      tasks.map(({ creator, assignees, ...rest }) => ({
        ...rest,
        createdBy: creator?.name ?? "Unknown",
        assignee:
          assignees.length > 0
            ? {
                id: assignees[0].user.id,
                name: assignees[0].user.name,
                email: assignees[0].user.email,
              }
            : null,
      }));

    return res.status(200).json({
      message: "success",
      data: {
        not_started: formatTasks(notStartedTasks),
        on_progress: formatTasks(onProgressTasks),
        done: formatTasks(doneTasks),
        reject: formatTasks(rejectTasks),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Invalid or expired token" });
  }
}
