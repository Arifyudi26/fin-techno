/**
 * Shared formatting utilities — currency, number, percentage.
 */

/** Format angka ke format mata uang IDR */
export function fmtIDR(val: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

/** Parse string angka (dengan separator ribuan) ke number */
export function parseAmount(val: string): number {
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")) || 0);
}

/** Hitung persentase perubahan antara dua periode */
export function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}
