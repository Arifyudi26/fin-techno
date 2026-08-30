import type { NextApiRequest } from "next";
import { common } from "./locales/common";
import { bankAccounts } from "./locales/bank-accounts";
import { wallets } from "./locales/wallets";
import { categories } from "./locales/categories";
import { auth } from "./locales/auth";
import { user } from "./locales/user";
import { upload } from "./locales/upload";
import { reports } from "./locales/reports";
import { notifications } from "./locales/notifications";
import { ai } from "./locales/ai";
import { telegram } from "./locales/telegram";

export type Lang = "id" | "en";

// Per-domain locale files, merged into one flat dictionary per language.
// Keys are language-neutral identifiers; values are the translated text
// sent to the client in API responses.
const groups = [
  common,
  bankAccounts,
  wallets,
  categories,
  auth,
  user,
  upload,
  reports,
  notifications,
  ai,
  telegram,
] as const;

const dict = {
  id: Object.assign({}, ...groups.map((g) => g.id)),
  en: Object.assign({}, ...groups.map((g) => g.en)),
} as {
  id: MergeGroups<typeof groups, "id">;
  en: MergeGroups<typeof groups, "en">;
};

// Intersect every group's language slice into a single flat type.
type MergeGroups<T extends readonly unknown[], L extends "id" | "en"> =
  UnionToIntersection<
    T[number] extends { [K in L]: infer V } ? V : never
  >;

type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type MessageKey = keyof (typeof dict)["id"];

/** Resolve the requested language from the x-app-lang header. Defaults to "id". */
export function getLang(req: NextApiRequest): Lang {
  const header = req.headers["x-app-lang"];
  const value = Array.isArray(header) ? header[0] : header;
  return value === "en" ? "en" : "id";
}

/** Translate a message key into text for the request's language. */
export function st(req: NextApiRequest, key: MessageKey): string {
  return dict[getLang(req)][key] as string;
}

// Parameterized messages (interpolated values) that can't be static keys.
export const msg = {
  unsupportedFormat(req: NextApiRequest, ext: string): string {
    return getLang(req) === "en"
      ? `${ext} format is not supported.`
      : `Format ${ext} tidak didukung.`;
  },
  duplicateFilename(req: NextApiRequest, fileName: string): string {
    return getLang(req) === "en"
      ? `File "${fileName}" has already been uploaded.`
      : `File "${fileName}" sudah pernah diupload.`;
  },
  duplicateContent(req: NextApiRequest, fileName: string): string {
    return getLang(req) === "en"
      ? `Content is identical to "${fileName}".`
      : `Konten identik dengan "${fileName}".`;
  },
};
