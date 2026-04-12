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

const selectClass =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export default function DashboardFilters({
  filters,
  accounts,
  categories,
  activePeriodLabel,
  onChange,
  onReset,
}: Props) {
  const hasActiveFilter =
    filters.month != null ||
    filters.year != null ||
    filters.accountId != null ||
    filters.categoryId != null ||
    filters.txType != null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Filter
          </span>
          {activePeriodLabel && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {activePeriodLabel}
            </span>
          )}
        </div>
        {hasActiveFilter && (
          <button
            onClick={onReset}
            className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Bulan */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Bulan
          </label>
          <select
            value={filters.month ?? ""}
            onChange={(e) =>
              onChange({ month: e.target.value ? parseInt(e.target.value) : null })
            }
            className={selectClass}
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Tahun */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Tahun
          </label>
          <select
            value={filters.year ?? ""}
            onChange={(e) =>
              onChange({ year: e.target.value ? parseInt(e.target.value) : null })
            }
            className={selectClass}
          >
            <option value="">Semua Tahun</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Rekening */}
        {accounts.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Rekening
            </label>
            <select
              value={filters.accountId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return onChange({ accountId: null, accountType: null });
                const acc = accounts.find((a) => a.id === val);
                onChange({ accountId: val, accountType: acc?.source ?? null });
              }}
              className={selectClass}
            >
              <option value="">Semua Rekening</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankProvider} {a.source === "WALLET" ? "(Wallet)" : ""} ***
                  {a.accountNumber.slice(-4)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kategori */}
        {categories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Kategori
            </label>
            <select
              value={filters.categoryId ?? ""}
              onChange={(e) => onChange({ categoryId: e.target.value || null })}
              className={selectClass}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tipe transaksi */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Tipe Transaksi
          </label>
          <select
            value={filters.txType ?? ""}
            onChange={(e) =>
              onChange({ txType: (e.target.value as "CREDIT" | "DEBIT") || null })
            }
            className={selectClass}
          >
            <option value="">Semua Tipe</option>
            <option value="CREDIT">Pemasukan</option>
            <option value="DEBIT">Pengeluaran</option>
          </select>
        </div>
      </div>
    </div>
  );
}
