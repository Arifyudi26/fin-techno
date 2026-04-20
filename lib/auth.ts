import jwt, { JwtPayload } from "jsonwebtoken";
import { NextApiRequest } from "next";

type DecodedToken = JwtPayload & { id: string; role: string };

export function verifyToken(req: NextApiRequest): DecodedToken {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.split(" ")[1];
  if (!token) throw new Error("Unauthorized");

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as DecodedToken;
    return decoded;
  } catch (error) {
    throw new Error("Invalid Token", error);
  }
}

/** Generate 6-digit OTP */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
