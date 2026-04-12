import { useEffect, useState } from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import type { BankAccountBalance } from "@/lib/types/dashboard";

export interface ReportFilterState {
  year: number;
  month: number | null;
  accountId: string | null;
  accountType: "BANK" | "WALLET" | null;
  categoryId: string | null;
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

export default function ReportFilters({ filters, onChange, onReset }: Props) {
  const [accounts, setAccounts] = useState<BankAccountBalance[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    axiosGlobal.get("/dashboard/accounts").then((r) => setAccounts(r.data)).catch(() => {});
    axiosGlobal.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {});
  }, []);

  const hasFilter = filters.month != null || filters.accountId != null || filters.categoryId != null;

  const selectCls = "h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] mb-6">
      <div className="flex flex-wrap items-center gap-3">

        {/* Tahun */}
        <select value={filters.year} onChange={(e) => onChange({ year: parseInt(e.target.value) })} className={selectCls}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Bulan */}
        <select
          value={filters.month ?? ""}
          onChange={(e) => onChange({ month: e.target.value ? parseInt(e.target.value) : null })}
          className={selectCls}
        >
          <option value="">Semua Bulan</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>

        {/* Rekening */}
        {accounts.length > 0 && (
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
        )}

        {/* Kategori */}
        {categories.length > 0 && (
          <select
            value={filters.categoryId ?? ""}
            onChange={(e) => onChange({ categoryId: e.target.value || null })}
            className={selectCls}
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* Reset */}
        {hasFilter && (
          <button
            onClick={onReset}
            className="h-9 px-3 rounded-lg text-sm font-medium text-error-600 dark:text-error-400 border border-error-200 dark:border-error-500/30 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
          >
            Reset
          </button>
        )}

        {/* Active period label */}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {filters.month != null
            ? `${MONTHS[filters.month - 1]} ${filters.year}`
            : `Tahun ${filters.year}`}
        </span>
      </div>
    </div>
  );
}
