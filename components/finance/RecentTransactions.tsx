import { useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@components/ui/table";
import Badge from "@components/ui/badge/Badge";
import { RecentTransaction } from "@/lib/types/dashboard";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

interface Props {
  data?: RecentTransaction[];
  loading?: boolean;
  onFilterChange?: (f: { type?: "CREDIT" | "DEBIT" | null; search?: string }) => void;
}

export default function RecentTransactions({ data = [], loading, onFilterChange }: Props) {
  const [localType, setLocalType] = useState<"" | "CREDIT" | "DEBIT">("");
  const [localSearch, setLocalSearch] = useState("");

  const handleTypeChange = (val: "" | "CREDIT" | "DEBIT") => {
    setLocalType(val);
    onFilterChange?.({ type: val || null, search: localSearch });
  };

  const handleSearch = (val: string) => {
    setLocalSearch(val);
    onFilterChange?.({ type: localType || null, search: val });
  };

  // Local filter on top of server data
  const filtered = data.filter((tx) => {
    if (localType && tx.type !== localType) return false;
    if (localSearch && !tx.description.toLowerCase().includes(localSearch.toLowerCase())) return false;
    return true;
  });

  const totalCredit = filtered.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalDebit = filtered.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Transaksi Terbaru</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} transaksi · Masuk: <span className="text-success-600 font-medium">{fmt(totalCredit)}</span> · Keluar: <span className="text-error-600 font-medium">{fmt(totalDebit)}</span>
            </p>
          </div>
          <Link href="/transactions" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
            Lihat Semua
          </Link>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(["", "CREDIT", "DEBIT"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  localType === t
                    ? "bg-brand-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {t === "" ? "Semua" : t === "CREDIT" ? "Masuk" : "Keluar"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari keterangan..."
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tanggal</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Keterangan</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Rekening</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Kategori</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">Jumlah</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-sm text-gray-400 dark:text-gray-500" colSpan={6}>
                    Tidak ada transaksi
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">{tx.date}</TableCell>
                    <TableCell className="py-3">
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 max-w-[200px] truncate" title={tx.description}>{tx.description}</p>
                      {tx.reference && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{tx.reference}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        {tx.source === "WALLET" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">WALLET</span>
                        )}
                        {tx.bankAccount}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {tx.categories && tx.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tx.categories.slice(0, 2).map((c) => (
                            <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                              {c.name}
                            </span>
                          ))}
                          {tx.categories.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">+{tx.categories.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{tx.category}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-end">
                      <span className={`font-semibold text-theme-sm ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>
                        {tx.status === "VERIFIED" ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
