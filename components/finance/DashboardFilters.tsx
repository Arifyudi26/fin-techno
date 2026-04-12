import { useState, useEffect } from "react";
import type { BankAccountBalance, DashboardFilters } from "@/lib/types/dashboard";

interface Props {
  filters: DashboardFilters;
  accounts: BankAccountBalance[];
  categories: { id: string; name: string }[];
  activePeriodLabel?: string;
  onChange: (f: Partial<DashboardFilters>) => void;
  onReset: () => void;
}

const inputClass =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export default function DashboardFilters({
  filters,
  accounts,
  categories,
  activePeriodLabel,
  onChange,
  onReset,
}: Props) {
  // Semua filter disimpan lokal — baru hit parent saat Apply
  const [local, setLocal] = useState({
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
    accountId: filters.accountId ?? "",
    categoryId: filters.categoryId ?? "",
    txType: filters.txType ?? "",
  });

  // Sync saat parent reset
  useEffect(() => {
    setLocal({
      dateFrom: filters.dateFrom ?? "",
      dateTo: filters.dateTo ?? "",
      accountId: filters.accountId ?? "",
      categoryId: filters.categoryId ?? "",
      txType: filters.txType ?? "",
    });
  }, [filters.dateFrom, filters.dateTo, filters.accountId, filters.categoryId, filters.txType]);

  const set = (key: keyof typeof local, val: string) =>
    setLocal((prev) => ({ ...prev, [key]: val }));

  const handleApply = () => {
    const acc = accounts.find((a) => a.id === local.accountId);
    onChange({
      dateFrom: local.dateFrom || null,
      dateTo: local.dateTo || null,
      accountId: local.accountId || null,
      accountType: local.accountId ? (acc?.source ?? null) : null,
      categoryId: local.categoryId || null,
      txType: (local.txType as "CREDIT" | "DEBIT") || null,
    });
  };

  const handleReset = () => {
    setLocal({ dateFrom: "", dateTo: "", accountId: "", categoryId: "", txType: "" });
    onReset();
  };

  const hasActiveFilter =
    filters.dateFrom != null ||
    filters.dateTo != null ||
    filters.accountId != null ||
    filters.categoryId != null ||
    filters.txType != null;

  // Dirty = local berbeda dari applied filters
  const isDirty =
    (local.dateFrom || null) !== filters.dateFrom ||
    (local.dateTo || null) !== filters.dateTo ||
    (local.accountId || null) !== filters.accountId ||
    (local.categoryId || null) !== filters.categoryId ||
    (local.txType || null) !== filters.txType;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter</span>
          {activePeriodLabel && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {activePeriodLabel}
            </span>
          )}
        </div>
        {hasActiveFilter && (
          <button
            onClick={handleReset}
            className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Dari Tanggal */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Dari Tanggal</label>
          <input
            type="date"
            value={local.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Sampai Tanggal */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
          <input
            type="date"
            value={local.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Rekening */}
        {accounts.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rekening</label>
            <select
              value={local.accountId}
              onChange={(e) => set("accountId", e.target.value)}
              className={inputClass}
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

        {/* Kategori */}
        {categories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Kategori</label>
            <select
              value={local.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipe transaksi */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipe Transaksi</label>
          <select
            value={local.txType}
            onChange={(e) => set("txType", e.target.value)}
            className={inputClass}
          >
            <option value="">Semua Tipe</option>
            <option value="CREDIT">Pemasukan</option>
            <option value="DEBIT">Pengeluaran</option>
          </select>
        </div>

        {/* Tombol Apply */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-transparent select-none">Cari</label>
          <button
            onClick={handleApply}
            disabled={!isDirty}
            title="Terapkan filter"
            className="h-9 w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
