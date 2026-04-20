/**
 * Format tanggal dari string ISO (YYYY-MM-DD) atau Date object
 * ke format Indonesia: DD/MM/YYYY
 */
export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date + (date.length === 10 ? "T00:00:00" : "")) : date;
  if (isNaN(d.getTime())) return String(date);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Re-export dari lib/formatters dan lib/dateUtils agar import lama tetap jalan
export { fmtIDR, parseAmount, pctChange } from "@lib/formatters";
export { timeAgo, parseDate, wibToUtc, utcToWibDateStr, dayRangeUTC } from "@lib/dateUtils";
