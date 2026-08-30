import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterBody } from "@/lib/types";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: st(req, "methodNotAllowed") });

  const { name, email, password }: RegisterBody = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: st(req, "nameEmailPasswordRequired") });
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ message: st(req, "emailRegistered") });

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await db.user.create({
      data: { name, email, password: hashedPassword, role: "user", loginProvider: "APP" as const },
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
    console.error(error);
    res.status(500).json({ message: st(req, "serverError") });
  }
}
