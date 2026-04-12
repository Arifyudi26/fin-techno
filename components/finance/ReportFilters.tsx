import { useEffect, useState } from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import type { BankAccountBalance } from "@/lib/types/dashboard";

export interface ReportFilterState {
  year: number;
  month: number | null;
  accountId: string | null;
  accountType: "BANK" | "WALLET" | null;
}

interface Props {
  filters: ReportFilterState;
  onChange: (f: Partial<ReportFilterState>) => void;
  onReset: () => void;
}

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const selectCls =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export default function ReportFilters({ filters, onChange, onReset }: Props) {
  const [accounts, setAccounts] = useState<BankAccountBalance[]>([]);

  useEffect(() => {
    axiosGlobal.get("/dashboard/accounts").then((r) => setAccounts(r.data)).catch(() => {});
  }, []);

  const hasFilter = filters.month != null || filters.accountId != null;

  const activePeriodLabel =
    filters.month != null
      ? `${MONTHS[filters.month - 1]} ${filters.year}`
      : `Tahun ${filters.year}`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03] mb-6">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {activePeriodLabel}
          </span>
        </div>
        {hasFilter && (
          <button
            onClick={onReset}
            className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Filter grid */}
      <div className={`grid gap-3 ${accounts.length > 0 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        {/* Tahun */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tahun</label>
          <select value={filters.year} onChange={(e) => onChange({ year: parseInt(e.target.value) })} className={selectCls}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Bulan */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Bulan</label>
          <select
            value={filters.month ?? ""}
            onChange={(e) => onChange({ month: e.target.value ? parseInt(e.target.value) : null })}
            className={selectCls}
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>

        {/* Rekening */}
        {accounts.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rekening</label>
            <select
              value={filters.accountId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return onChange({ accountId: null, accountType: null });
                const acc = accounts.find((a) => a.id === val);
                onChange({ accountId: val, accountType: acc?.source ?? null });
              }}
              className={selectCls}
            >
              <option value="">Semua Rekening</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankProvider} {a.source === "WALLET" ? "(Wallet)" : ""} ***{a.accountNumber.slice(-4)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
