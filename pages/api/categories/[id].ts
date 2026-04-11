import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try {
    const decoded = verifyToken(req);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query as { id: string };
  const cat = await prisma.transactionCategory.findUnique({ where: { id } });
  if (!cat) return res.status(404).json({ message: "Kategori tidak ditemukan" });
  // only allow modifying categories owned by this user (userId null = legacy global categories)
  if (cat.userId !== userId) return res.status(403).json({ message: "Forbidden" });

  if (req.method === "PUT") {
    const { name, description } = req.body;
    const updated = await prisma.transactionCategory.update({ where: { id }, data: { name, description } });
    return res.status(200).json({ category: updated });
  }

  if (req.method === "DELETE") {
    await prisma.transactionCategory.delete({ where: { id } });
    return res.status(200).json({ message: "Kategori dihapus" });
  }

  return res.status(405).end();
}
