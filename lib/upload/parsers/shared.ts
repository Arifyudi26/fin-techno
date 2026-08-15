/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionType } from "@prisma/client";

// Tipe baris hasil parse
export type ParsedRow = {
  date: string;
  valueDate: string;
  description: string;
  debit: string;
  credit: string;
  openingBalance: string;
  balance: string;
  reference: string;
  sign: string;
};

// CSV parser
export function parseCSV(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
}

// Column mapping (kandidat nama kolom yang dikenali)
export const COLUMN_CANDIDATES = {
  date:           ["tgl_tran", "tanggal transaksi", "tanggal", "transaction date", "date", "tgl", "tgl."],
  valueDate:      ["tgl_efektif", "tanggal efektif", "value date", "tgl valuta", "tgl. efektif", "tgl efektif"],
  description:    ["remark_custom", "desk_tran", "keterangan", "description", "deskripsi", "ket", "narasi", "detail transaksi"],
  debit:          ["mutasi_debet", "debet", "debit", "pengeluaran", "keluar", "db"],
  credit:         ["mutasi_kredit", "kredit", "credit", "pemasukan", "masuk", "cr"],
  openingBalance: ["saldo_awal_mutasi", "saldo awal"],
  balance:        ["saldo_akhir_mutasi", "saldo akhir", "saldo", "balance", "saldo setelah"],
  reference:      ["seq", "no. referensi", "referensi", "reference", "no. transaksi", "nomor referensi", "ref"],
  sign:           ["glsign", "dc", "type", "jenis"],
} as const;

export function findColIdx(header: string[], candidates: readonly string[]): number {
  // Normalisasi: hapus titik dan spasi ganda untuk matching yang lebih toleran
  const normalize = (s: string) => s.replace(/\./g, "").replace(/\s+/g, " ").trim();
  const normalizedHeader = header.map(normalize);

  for (const candidate of candidates) {
    const normCandidate = normalize(candidate);
    // Exact match dulu
    const exact = normalizedHeader.indexOf(normCandidate);
    if (exact >= 0) return exact;
    // Partial match
    const partial = normalizedHeader.findIndex((h) => h.includes(normCandidate));
    if (partial >= 0) return partial;
  }
  return -1;
}

// Deteksi tipe transaksi (CREDIT / DEBIT)
export function detectType(
  desc: string,
  debitVal: string,
  creditVal: string,
  signVal?: string,
): TransactionType {
  if (signVal) {
    const s = signVal.trim().toLowerCase();
    if (s === "cr" || s === "c") return TransactionType.CREDIT;
    if (s === "db" || s === "d") return TransactionType.DEBIT;
  }
  if (creditVal && Number(creditVal.replace(/[^0-9.-]/g, "")) > 0) return TransactionType.CREDIT;
  if (debitVal  && Number(debitVal.replace(/[^0-9.-]/g, ""))  > 0) return TransactionType.DEBIT;
  const lower = desc.toLowerCase();
  if (
    lower.includes("masuk") ||
    lower.includes("kredit") ||
    lower.includes("top up") ||
    lower.includes("terima")
  ) return TransactionType.CREDIT;
  return TransactionType.DEBIT;
}

// Parse baris CSV menjadi ParsedRow[]
export function parseRows(rows: string[][]): ParsedRow[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idx = {
    date:           findColIdx(header, COLUMN_CANDIDATES.date),
    valueDate:      findColIdx(header, COLUMN_CANDIDATES.valueDate),
    desc:           findColIdx(header, COLUMN_CANDIDATES.description),
    debit:          findColIdx(header, COLUMN_CANDIDATES.debit),
    credit:         findColIdx(header, COLUMN_CANDIDATES.credit),
    openingBalance: findColIdx(header, COLUMN_CANDIDATES.openingBalance),
    balance:        findColIdx(header, COLUMN_CANDIDATES.balance),
    ref:            findColIdx(header, COLUMN_CANDIDATES.reference),
    sign:           findColIdx(header, COLUMN_CANDIDATES.sign),
  };
  return rows.slice(1).map((row) => ({
    date:           idx.date           >= 0 ? (row[idx.date]           ?? "") : "",
    valueDate:      idx.valueDate      >= 0 ? (row[idx.valueDate]      ?? "") : "",
    description:    idx.desc           >= 0 ? (row[idx.desc]           ?? "") : (row[1] ?? ""),
    debit:          idx.debit          >= 0 ? (row[idx.debit]          ?? "") : "",
    credit:         idx.credit         >= 0 ? (row[idx.credit]         ?? "") : "",
    openingBalance: idx.openingBalance >= 0 ? (row[idx.openingBalance] ?? "") : "",
    balance:        idx.balance        >= 0 ? (row[idx.balance]        ?? "") : "",
    reference:      idx.ref            >= 0 ? (row[idx.ref]            ?? "") : "",
    sign:           idx.sign           >= 0 ? (row[idx.sign]           ?? "") : "",
  }));
}
