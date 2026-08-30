import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try {
    const decoded = verifyToken(req);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: st(req, "unauthorized") });
  }

  const { id } = req.query as { id: string };
  const cat = await prisma.transactionCategory.findUnique({ where: { id } });
  if (!cat) return res.status(404).json({ message: st(req, "categoryNotFound") });
  // only allow modifying categories owned by this user (userId null = legacy global categories)
  if (cat.userId !== userId) return res.status(403).json({ message: st(req, "forbidden") });

  if (req.method === "PUT") {
    const { name, description } = req.body;
    const updated = await prisma.transactionCategory.update({ where: { id }, data: { name, description } });
    return res.status(200).json({ category: updated });
  }

  if (req.method === "DELETE") {
    // Junction rows (BankTransactionCategory & WalletTransactionCategory) akan
    // otomatis terhapus via onDelete: Cascade di schema Prisma.
    // Transaksi yang tadinya pakai kategori ini akan jadi "Lainnya" (tidak punya kategori).
    await prisma.transactionCategory.delete({ where: { id } });
    return res.status(200).json({ message: st(req, "categoryDeleted") });
  }

  return res.status(405).end();
}
