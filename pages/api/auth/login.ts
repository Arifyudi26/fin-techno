import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginRequestBody, LoginResponse } from "@/lib/types";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { st } from "@lib/server-i18n";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password }: LoginRequestBody = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: st(req, "emailPasswordRequired") });
  }

  // Rate limiting: max 10 failed attempts per IP+email in 15 minutes
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const rateLimitKey = `login:${ip}:${email}`;
  const rateLimit = checkRateLimit(rateLimitKey, {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 15 * 60 * 1000, // block for 15 minutes
  });

  if (!rateLimit.allowed) {
    const retryAfterSec = Math.ceil((rateLimit.retryAfterMs || 0) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    return res.status(429).json({
      message: st(req, "tooManyLogin"),
      retryAfterSeconds: retryAfterSec,
    });
  }

  try {
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: st(req, "userNotFound") });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: st(req, "invalidCredentials") });
    }

    // Login berhasil — reset rate limit
    resetRateLimit(rateLimitKey);

    // checkOnly: hanya validasi credentials, tidak return token (untuk flow OTP)
    if (req.body.checkOnly) {
      return res.status(200).json({ message: st(req, "credentialsValid") });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );


    const data: LoginResponse = { token, role: user.role, name: user.name, id: user.id, avatar: user.avatar ?? null };
    res.status(200).json({ message: "success", data: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: st(req, "serverError") });
  }
}
