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

/** Parse berbagai format tanggal ke Date object, return null jika gagal.
 *  Semua tanggal disimpan sebagai UTC midnight (jam 00:00:00 UTC) agar
 *  nilai di DB sama persis dengan tanggal di CSV — tanpa shift timezone.
 */
export function parseDate(val: string): Date | null {
  if (!val) return null;
  const clean = val.trim();

  // Helper: buat UTC Date dari komponen tanggal — TANPA konversi timezone.
  // Tanggal bank statement adalah "tanggal kalender", bukan timestamp.
  const utc = (y: number, m: number, d: number, H = 0, M = 0, S = 0): Date =>
    new Date(Date.UTC(y, m - 1, d, H, M, S));

  type DatePattern = [RegExp, (m: RegExpMatchArray) => Date | null];
  const patterns: DatePattern[] = [
    // ISO: YYYY-MM-DDTHH:MM:SS atau YYYY-MM-DD HH:MM:SS
    [/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/, ([, y, mo, d, H, M, S]) => utc(+y, +mo, +d, +H, +M, +S)],
    // BRI PDF: "dd/mm/yy HH:MM:SS"
    [/^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/, ([, d, mo, y, H, M, S]) => utc(2000 + +y, +mo, +d, +H, +M, +S)],
    // YYYY-MM-DD
    [/^(\d{4})-(\d{2})-(\d{2})$/, ([, y, mo, d]) => utc(+y, +mo, +d)],
    // M/D/YYYY atau D/M/YYYY — format Excel/CSV BRI: "4/11/2026"
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, ([, d, mo, y]) => utc(+y, +mo, +d)],
    // DD-MM-YYYY
    [/^(\d{1,2})-(\d{1,2})-(\d{4})$/, ([, d, mo, y]) => utc(+y, +mo, +d)],
    // DD.MM.YYYY
    [/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, ([, d, mo, y]) => utc(+y, +mo, +d)],
    // DD/MM/YY
    [/^(\d{2})\/(\d{2})\/(\d{2})$/, ([, d, mo, y]) => utc(2000 + +y, +mo, +d)],
    // DD/MM/YYYY HH:MM:SS
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/, ([, d, mo, y, H, M, S]) => utc(+y, +mo, +d, +H, +M, +S)],
    // M/D/YYYY H:MM:SS AM/PM — format Excel BRI: "4/11/2026 12:00:00 AM"
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/i, ([, d, mo, y, H, M, S, ampm]) => {
      let h = +H;
      if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
      if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
      return utc(+y, +mo, +d, h, +M, +S);
    }],
  ];

  for (const [regex, builder] of patterns) {
    const match = clean.match(regex);
    if (match) {
      const result = builder(match);
      if (result && !isNaN(result.getTime())) return result;
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
