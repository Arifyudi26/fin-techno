/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  try {
    const db = prisma as any;

    const [bankAccounts, wallets] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true, bankProvider: true, accountNumber: true, accountName: true },
        orderBy: { createdAt: "asc" },
      }),
      db.digitalWallet.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true, walletProvider: true, phoneNumber: true, accountName: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return res.status(200).json({
      bankAccounts: bankAccounts.map((a: any) => ({
        id: a.id,
        provider: a.bankProvider,
        identifier: `***${a.accountNumber.slice(-4)}`,
        accountName: a.accountName,
        type: "BANK",
      })),
      wallets: wallets.map((w: any) => ({
        id: w.id,
        provider: w.walletProvider,
        identifier: `***${w.phoneNumber.slice(-4)}`,
        accountName: w.accountName,
        type: "WALLET",
      })),
    });
  } catch (error) {
    console.error("upload accounts error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
