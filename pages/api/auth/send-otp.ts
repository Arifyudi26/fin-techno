import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { sendOtpEmail } from "@/lib/mailer";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, purpose } = req.body;

  const validPurposes = ["login", "register", "change-password", "oauth"];
  if (!email || !purpose || !validPurposes.includes(purpose)) {
    return res.status(400).json({ message: "Email dan purpose wajib diisi" });
  }

  // Cek user untuk login & change-password
  if (purpose === "login" || purpose === "change-password") {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email tidak ditemukan" });
  }

  // Cek email belum terdaftar untuk register
  if (purpose === "register") {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email sudah terdaftar" });
  }

  // Hapus OTP lama untuk email + purpose ini
  await db.otpCode.deleteMany({ where: { email, purpose } });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

  await db.otpCode.create({ data: { email, code, purpose, expiresAt } });

  try {
    await sendOtpEmail(email, code, purpose);
    return res.status(200).json({ message: "OTP berhasil dikirim" });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ message: "Gagal mengirim email OTP" });
  }
}
