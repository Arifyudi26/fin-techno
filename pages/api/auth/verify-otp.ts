import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { checkOtpAttempt, recordOtpFailure, resetOtpAttempts } from "@/lib/rate-limit";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code, purpose, name, password } = req.body;

  if (!email || !code || !purpose) {
    return res.status(400).json({ message: st(req, "emailCodePurposeRequired") });
  }

  // Check OTP attempt lockout: max 5 failed attempts, lockout 5 minutes
  const otpCheck = checkOtpAttempt(email, { maxAttempts: 5, lockoutDurationMs: 5 * 60 * 1000 });
  if (!otpCheck.allowed) {
    const retryAfterSec = Math.ceil((otpCheck.lockedUntilMs || 0) / 1000);
    return res.status(429).json({
      message: st(req, "tooManyOtp"),
      retryAfterSeconds: retryAfterSec,
    });
  }

  const otp = await db.otpCode.findFirst({
    where: { email, purpose, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return res.status(400).json({ message: st(req, "otpInvalid") });

  if (otp.code !== code) {
    // Record failed attempt
    const failResult = recordOtpFailure(email, { maxAttempts: 5, lockoutDurationMs: 5 * 60 * 1000 });
    if (!failResult.allowed) {
      return res.status(429).json({
        message: st(req, "tooManyOtpWrong"),
        retryAfterSeconds: Math.ceil((failResult.lockedUntilMs || 0) / 1000),
      });
    }
    return res.status(400).json({
      message: st(req, "otpWrong"),
      attemptsRemaining: failResult.attemptsRemaining,
    });
  }

  if (new Date() > otp.expiresAt) return res.status(400).json({ message: st(req, "otpExpired") });

  // OTP valid — reset attempt counter
  resetOtpAttempts(email);

  // Tandai OTP sebagai used
  await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });

  // Handle berdasarkan purpose
  if (purpose === "register") {
    if (!name || !password) return res.status(400).json({ message: st(req, "namedanPasswordRequired") });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await db.user.create({
      data: { name, email, password: hashedPassword, role: "user", loginProvider: "APP" },
    });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    return res.status(201).json({ message: "success", data: { token, role: user.role, name: user.name, id: user.id } });
  }

  if (purpose === "login" || purpose === "oauth") {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: st(req, "userNotFound") });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    return res.status(200).json({ message: "success", data: { token, role: user.role, name: user.name, id: user.id, avatar: user.avatar ?? null } });
  }

  if (purpose === "change-password") {
    if (!password) return res.status(400).json({ message: st(req, "newPasswordRequired") });
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.user.update({ where: { email }, data: { password: hashedPassword } });
    return res.status(200).json({ message: st(req, "passwordChanged") });
  }

  return res.status(400).json({ message: st(req, "invalidPurpose") });
}
