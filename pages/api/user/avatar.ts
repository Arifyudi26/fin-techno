/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { put } from "@vercel/blob";

export const config = {
  api: { bodyParser: false },
};

function parseMultipart(req: NextApiRequest): Promise<{
  file: { buffer: Buffer; filename: string; mimeType: string } | null;
}> {
  return new Promise((resolve, reject) => {
    const Busboy = require("busboy");
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });
    let fileResult: { buffer: Buffer; filename: string; mimeType: string } | null = null;

    bb.on("file", (_field: string, stream: any, info: any) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        fileResult = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
        };
      });
      stream.on("error", reject);
    });
    bb.on("finish", () => resolve({ file: fileResult }));
    bb.on("error", reject);
    req.pipe(bb);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  try {
    const { file } = await parseMultipart(req);
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
