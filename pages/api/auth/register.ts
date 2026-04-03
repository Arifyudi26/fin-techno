import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import { RegisterBody } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { email, password }: RegisterBody = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  try {
    const data = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "user",
      },
    });
    res.status(201).json({ message: "success", data: data });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
