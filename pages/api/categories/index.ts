import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try { verifyToken(req); }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  if (req.method === "GET") {
    try {
      const categories = await prisma.transactionCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });

      // count transactions per category (bank + wallet)
      const result = await Promise.all(categories.map(async (cat) => {
        const bankCount = await prisma.bankTransaction.count({ where: { categoryId: cat.id } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walletCount = await (prisma as any).walletTransaction.count({ where: { categoryId: cat.id } });
        return { ...cat, transactionCount: bankCount + walletCount };
      }));

      return res.status(200).json({ categories: result });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ message: "name dan code wajib diisi" });
    const codeUpper = (code as string).toUpperCase().slice(0, 5);
    try {
      const existing = await prisma.transactionCategory.findFirst({ where: { code: codeUpper } });
      if (existing) return res.status(409).json({ message: "Kode kategori sudah digunakan" });
      const cat = await prisma.transactionCategory.create({ data: { name, code: codeUpper, description } });
      return res.status(201).json({ category: cat });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
