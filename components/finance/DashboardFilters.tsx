import type { BankAccountBalance, DashboardFilters } from "@/lib/types/dashboard";

interface Props {
  filters: DashboardFilters;
  accounts: BankAccountBalance[];
  categories: { id: string; name: string }[];
  activePeriodLabel?: string;
  onChange: (f: Partial<DashboardFilters>) => void;
  onReset: () => void;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function DashboardFilters({ filters, accounts, categories, activePeriodLabel, onChange, onReset }: Props) {
  const hasActiveFilter =
    filters.month != null || filters.year != null ||
    filters.accountId != null || filters.categoryId != null ||
    filters.txType != null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-3">
        {/* Period label */}
        {activePeriodLabel && (
          <span className="text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-full">
            {activePeriodLabel}
          </span>
        )}

        {/* Bulan */}
        <select
          value={filters.month ?? ""}
          onChange={(e) => onChange({ month: e.target.value ? parseInt(e.target.value) : null })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Semua Bulan</option>
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Tahun */}
        <select
          value={filters.year ?? ""}
          onChange={(e) => onChange({ year: e.target.value ? parseInt(e.target.value) : null })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Semua Tahun</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
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
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Tipe transaksi */}
        <select
          value={filters.txType ?? ""}
          onChange={(e) => onChange({ txType: (e.target.value as "CREDIT" | "DEBIT") || null })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Semua Tipe</option>
          <option value="CREDIT">Pemasukan</option>
          <option value="DEBIT">Pengeluaran</option>
        </select>

        {/* Reset */}
        {hasActiveFilter && (
          <button
            onClick={onReset}
            className="h-9 px-3 rounded-lg text-sm font-medium text-error-600 dark:text-error-400 border border-error-200 dark:border-error-500/30 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
