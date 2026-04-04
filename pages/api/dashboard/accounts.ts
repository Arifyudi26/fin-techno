import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { ownerId: userId, isActive: true },
      select: { id: true, bankProvider: true, accountNumber: true, accountName: true, currency: true },
    });

    const accountsWithBalance = await Promise.all(
      bankAccounts.map(async (acc) => {
        const last = await prisma.bankTransaction.findFirst({
          where: { bankAccountId: acc.id },
          orderBy: { transactionDate: "desc" },
          select: { balance: true },
        });
        return { ...acc, balance: Number(last?.balance ?? 0) };
      })
    );

    return res.status(200).json(accountsWithBalance);
  } catch (error) {
    console.error("accounts error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
