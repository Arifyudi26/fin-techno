/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { st } from "@lib/server-i18n";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: st(req, "unauthorized") });
  }

  try {
    const db = prisma as any;

    const [bankAccounts, wallets] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { ownerId: userId, isActive: true },
        select: {
          id: true,
          bankProvider: true,
          accountNumber: true,
          accountName: true,
          currency: true,
        },
      }),
      db.digitalWallet.findMany({
        where: { ownerId: userId, isActive: true },
        select: {
          id: true,
          walletProvider: true,
          phoneNumber: true,
          accountName: true,
        },
      }),
    ]);

    const bankWithBalance = await Promise.all(
      bankAccounts.map(
        async (acc: {
          id: string;
          bankProvider: string;
          accountNumber: string;
          accountName: string;
          currency: string;
        }) => {
          const last = await prisma.bankTransaction.findFirst({
            where: { bankAccountId: acc.id },
            orderBy: { transactionDate: "desc" },
            select: { balance: true },
          });
          return {
            ...acc,
            source: "BANK",
            identifier: acc.accountNumber,
            balance: Number(last?.balance ?? 0),
          };
        },
      ),
    );

    const walletWithBalance = await Promise.all(
      wallets.map(
        async (w: {
          id: string;
          walletProvider: string;
          phoneNumber: string;
          accountName: string;
        }) => {
          const last = await db.walletTransaction.findFirst({
            where: { walletId: w.id },
            orderBy: { transactionDate: "desc" },
            select: { balance: true },
          });
          return {
            id: w.id,
            bankProvider: w.walletProvider,
            accountNumber: w.phoneNumber,
            accountName: w.accountName,
            currency: "IDR",
            source: "WALLET",
            identifier: w.phoneNumber,
            balance: Number(last?.balance ?? 0),
          };
        },
      ),
    );

    return res.status(200).json([...bankWithBalance, ...walletWithBalance]);
  } catch (error) {
    console.error("accounts error:", error);
    return res.status(500).json({ message: st(req, "serverError") });
  }
}
