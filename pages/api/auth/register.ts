import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterBody } from "@/lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { name, email, password }: RegisterBody = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Nama, email, dan password wajib diisi" });
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ message: "Email sudah terdaftar" });

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await db.user.create({
      data: { name, email, password: hashedPassword, role: "user", loginProvider: "APP" },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "success",
      data: { token, role: user.role, name: user.name, id: user.id },
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
  }
}
