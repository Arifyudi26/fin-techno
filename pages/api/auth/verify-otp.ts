import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code, purpose, name, password } = req.body;

  if (!email || !code || !purpose) {
    return res.status(400).json({ message: "Email, kode, dan purpose wajib diisi" });
  }

  const otp = await db.otpCode.findFirst({
    where: { email, purpose, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return res.status(400).json({ message: "Kode OTP tidak valid" });
  if (otp.code !== code) return res.status(400).json({ message: "Kode OTP salah" });
  if (new Date() > otp.expiresAt) return res.status(400).json({ message: "Kode OTP sudah kadaluarsa" });

  // Tandai OTP sebagai used
  await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });

  // Handle berdasarkan purpose
  if (purpose === "register") {
    if (!name || !password) return res.status(400).json({ message: "Nama dan password wajib diisi" });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await db.user.create({
      data: { name, email, password: hashedPassword, role: "user", loginProvider: "APP" },
    });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    return res.status(201).json({ message: "success", data: { token, role: user.role, name: user.name, id: user.id } });
  }

  if (purpose === "login" || purpose === "oauth") {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    return res.status(200).json({ message: "success", data: { token, role: user.role, name: user.name, id: user.id, avatar: user.avatar ?? null } });
  }

  if (purpose === "change-password") {
    if (!password) return res.status(400).json({ message: "Password baru wajib diisi" });
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.user.update({ where: { email }, data: { password: hashedPassword } });
    return res.status(200).json({ message: "Password berhasil diubah" });
  }

  return res.status(400).json({ message: "Purpose tidak valid" });
}
