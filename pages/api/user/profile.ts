import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  if (req.method === "GET") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const [bankAccountCount, walletCount, uploadCount, transactionCount] = await Promise.all([
      prisma.bankAccount.count({ where: { ownerId: userId } }),
      prisma.digitalWallet.count({ where: { ownerId: userId } }),
      prisma.bankStatementUpload.count({ where: { uploadedById: userId } }),
      prisma.bankTransaction.count({ where: { bankAccount: { ownerId: userId } } }),
    ]);

    return res.status(200).json({
      user,
      stats: { bankAccountCount, walletCount, uploadCount, transactionCount },
    });
  }

  if (req.method === "PUT") {
    const { name, currentPassword, newPassword } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      const updateData: { name?: string; password?: string } = {};
      if (name) updateData.name = name;

      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ message: "Password lama wajib diisi" });
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ message: "Password lama tidak sesuai" });
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, name: true, email: true, role: true },
      });
      return res.status(200).json({ user: updated });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
