import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { id } = req.query as { id: string };

  const account = await prisma.bankAccount.findFirst({ where: { id, ownerId: userId } });
  if (!account) return res.status(404).json({ message: "Rekening tidak ditemukan" });

  // PUT — update
  if (req.method === "PUT") {
    const { accountName, description, isActive } = req.body;
    try {
      const updated = await prisma.bankAccount.update({
        where: { id },
        data: { accountName, description, isActive },
      });
      return res.status(200).json({ account: updated });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // DELETE
  if (req.method === "DELETE") {
    try {
      await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
      return res.status(200).json({ message: "Rekening dinonaktifkan" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
