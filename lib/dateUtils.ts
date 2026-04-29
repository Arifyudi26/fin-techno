/**
 * Shared date/timezone utilities — WIB (UTC+7) conversions and date parsing.
 */

const WIB_OFFSET_HOURS = 7;
const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000;

/** Convert YYYY-MM-DD (WIB local) ke UTC Date */
export function wibToUtc(dateStr: string, endOfDay = false): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (endOfDay)
    return new Date(Date.UTC(y, m - 1, d, 24 - WIB_OFFSET_HOURS, 0, 0, -1));
  return new Date(Date.UTC(y, m - 1, d, 0 - WIB_OFFSET_HOURS, 0, 0, 0));
}

/** Convert UTC Date ke string YYYY-MM-DD dalam timezone WIB */
export function utcToWibDateStr(dt: Date): string {
  const wib = new Date(dt.getTime() + WIB_OFFSET_MS);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
}

/** Dapatkan range UTC untuk satu hari penuh dalam WIB */
export function dayRangeUTC(dateStr: string): { gte: Date; lte: Date } {
  return {
    gte: wibToUtc(dateStr, false),
    lte: wibToUtc(dateStr, true),
  };
}

/** Parse berbagai format tanggal ke Date object, return null jika gagal */
export function parseDate(val: string): Date | null {
  if (!val) return null;
  const clean = val.trim();

  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ][\d:]+/);
  if (isoMatch) {
    const d = new Date(isoMatch[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  const briPdfMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+\d{2}:\d{2}:\d{2}/);
  if (briPdfMatch) {
    const [, dd, mm, yy] = briPdfMatch;
    const d = new Date(`20${yy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // BNI PDF: DD/MM/YYYY HH:MM:SS
  const bniPdfMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}:\d{2}/);
  if (bniPdfMatch) {
    const [, dd, mm, yyyy] = bniPdfMatch;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(\d{4})-(\d{2})-(\d{2})$/, ([, y, m, d]) => `${y}-${m}-${d}`],
    [/^(\d{2})\/(\d{2})\/(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],
    [/^(\d{2})-(\d{2})-(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],
    [/^(\d{2})\.(\d{2})\.(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],
    [/^(\d{2})\/(\d{2})\/(\d{2})$/, ([, d, m, y]) => `20${y}-${m}-${d}`],
  ];

  for (const [regex, builder] of patterns) {
    const match = clean.match(regex);
    if (match) {
      const d = new Date(builder(match));
      if (!isNaN(d.getTime())) return d;
    }
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

/** Format relative time dalam Bahasa Indonesia */
export function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}
