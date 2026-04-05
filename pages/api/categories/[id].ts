import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try { verifyToken(req); }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { id } = req.query as { id: string };
  const cat = await prisma.transactionCategory.findUnique({ where: { id } });
  if (!cat) return res.status(404).json({ message: "Kategori tidak ditemukan" });

  if (req.method === "PUT") {
    const { name, description } = req.body;
    const updated = await prisma.transactionCategory.update({ where: { id }, data: { name, description } });
    return res.status(200).json({ category: updated });
  }

  if (req.method === "DELETE") {
    await prisma.transactionCategory.update({ where: { id }, data: { isActive: false } });
    return res.status(200).json({ message: "Kategori dihapus" });
  }

  return res.status(405).end();
}
