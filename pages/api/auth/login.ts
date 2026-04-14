import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginRequestBody, LoginResponse } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password }: LoginRequestBody = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    // checkOnly: hanya validasi credentials, tidak return token (untuk flow OTP)
    if (req.body.checkOnly) {
      return res.status(200).json({ message: "credentials valid" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );


    const data: LoginResponse = { token, role: user.role, name: user.name, id:user.id};
    res.status(200).json({ message: "success", data: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
}
