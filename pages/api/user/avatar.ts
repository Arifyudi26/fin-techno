import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { put } from "@vercel/blob";
import { parseMultipart } from "@lib/multipartParser";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  try {
    const { file } = await parseMultipart(req, 5 * 1024 * 1024);
    if (!file) return res.status(400).json({ message: "File tidak ditemukan" });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimeType)) {
      return res.status(400).json({ message: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." });
    }

    const ext = file.filename.split(".").pop() ?? "jpg";
    const blobPath = `avatars/${userId}/avatar.${ext}`;

    const blob = await put(blobPath, file.buffer, {
      access: "private",
      contentType: file.mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatar: blob.url },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    return res.status(200).json({ user: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Gagal mengupload foto profil" });
  }
}
