/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: st(req, "unauthorized") }); }

  const db = prisma as any;
  const { id } = req.query as { id: string };

  const wallet = await db.digitalWallet.findFirst({ where: { id, ownerId: userId } });
  if (!wallet) return res.status(404).json({ message: st(req, "walletNotFound") });

  if (req.method === "PUT") {
    const { accountName, isActive } = req.body;
    const updated = await db.digitalWallet.update({ where: { id }, data: { accountName, isActive } });
    return res.status(200).json({ wallet: updated });
  }

  if (req.method === "DELETE") {
    const txCount = await db.walletTransaction.count({ where: { walletId: id } });
    if (txCount > 0) {
      await db.digitalWallet.update({ where: { id }, data: { isActive: false } });
      return res.status(200).json({ message: st(req, "walletDeactivatedHasHistory"), softDeleted: true });
    }
    await db.digitalWallet.delete({ where: { id } });
    return res.status(200).json({ message: st(req, "walletDeleted"), softDeleted: false });
  }

  return res.status(405).end();
}
