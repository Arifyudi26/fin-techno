/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const db = prisma as any;
  const { id } = req.query as { id: string };

  const wallet = await db.digitalWallet.findFirst({ where: { id, ownerId: userId } });
  if (!wallet) return res.status(404).json({ message: "Dompet tidak ditemukan" });

  if (req.method === "PUT") {
    const { accountName, isActive } = req.body;
    const updated = await db.digitalWallet.update({ where: { id }, data: { accountName, isActive } });
    return res.status(200).json({ wallet: updated });
  }

  if (req.method === "DELETE") {
    await db.digitalWallet.update({ where: { id }, data: { isActive: false } });
    return res.status(200).json({ message: "Dompet dinonaktifkan" });
  }

  return res.status(405).end();
}
