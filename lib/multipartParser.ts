/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unified multipart form parser menggunakan busboy.
 */
import { NextApiRequest } from "next";

export type ParsedFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};

export type ParseMultipartResult = {
  fields: Record<string, string>;
  file: ParsedFile | null;
};

/**
 * Parse multipart/form-data request.
 * @param fileSizeLimit - batas ukuran file dalam bytes (default 10MB)
 */
export function parseMultipart(
  req: NextApiRequest,
  fileSizeLimit = 10 * 1024 * 1024,
): Promise<ParseMultipartResult> {
  return new Promise((resolve, reject) => {
    const Busboy = require("busboy");
    const bb = Busboy({ headers: req.headers, limits: { fileSize: fileSizeLimit } });
    const fields: Record<string, string> = {};
    let fileResult: ParsedFile | null = null;

    bb.on("field", (name: string, val: string) => {
      fields[name] = val;
    });
    bb.on("file", (_field: string, stream: any, info: any) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        fileResult = {
          buffer,
          filename: info.filename,
          mimeType: info.mimeType,
          size: buffer.length,
        };
      });
      stream.on("error", reject);
    });
    bb.on("finish", () => resolve({ fields, file: fileResult }));
    bb.on("error", reject);
    req.pipe(bb);
  });
}
