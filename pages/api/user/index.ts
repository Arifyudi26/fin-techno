import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { st } from "@lib/server-i18n";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: st(req, "methodNotAllowed") });
  }

  try {
    const users = await db.user.findMany({
      where: {
        role: "user",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({ message: st(req, "noUsersFound") });
    }

    return res.status(200).json({
      message: "success",
      data: users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: st(req, "serverError") });
  }
}
