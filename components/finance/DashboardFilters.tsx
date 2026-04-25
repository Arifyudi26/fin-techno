import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { BankAccountBalance, DashboardFilters } from "@/lib/types/dashboard";
import { useI18n } from "@lib/i18n";

const DatePicker = dynamic(() => import("@components/form/DatePicker"), { ssr: false });

interface Props {
  filters: DashboardFilters;
  accounts: BankAccountBalance[];
  categories: { id: string; name: string }[];
  activePeriodLabel?: string;
  onChange: (f: Partial<DashboardFilters>) => void;
  onReset: () => void;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}

const selectClass =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export default function DashboardFilters({
  filters,
  accounts,
  categories,
  activePeriodLabel,
  onChange,
  onReset,
  defaultDateFrom = "",
  defaultDateTo = "",
}: Props) {
  const { t } = useI18n();
  const tr = t.dashboard;

  const [isOpen, setIsOpen] = useState(false);
  const [local, setLocal] = useState({
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
    accountId: filters.accountId ?? "",
    categoryId: filters.categoryId ?? "",
    txType: filters.txType ?? "",
  });

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
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocal({ dateFrom: defaultDateFrom, dateTo: defaultDateTo, accountId: "", categoryId: "", txType: "" });
    onReset();
  };

  const hasActiveFilter =
    filters.dateFrom != null ||
    filters.dateTo != null ||
    filters.accountId != null ||
    filters.categoryId != null ||
    filters.txType != null;

  const isDirty =
    (local.dateFrom || null) !== filters.dateFrom ||
    (local.dateTo || null) !== filters.dateTo ||
    (local.accountId || null) !== filters.accountId ||
    (local.categoryId || null) !== filters.categoryId ||
    (local.txType || null) !== filters.txType;

  const activeCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.accountId,
    filters.categoryId,
    filters.txType,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header — always visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Toggle button (mobile) */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="flex items-center gap-2 lg:hidden"
            aria-expanded={isOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500 dark:text-gray-400">
              <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{tr.filter}</span>
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Desktop label */}
          <div className="hidden lg:flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500 dark:text-gray-400">
              <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{tr.filter}</span>
            {activePeriodLabel && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                {activePeriodLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activePeriodLabel && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 lg:hidden">
              {activePeriodLabel}
            </span>
          )}
          {hasActiveFilter && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
            >
              {tr.reset}
            </button>
          )}
        </div>
      </div>

      {/* Filter grid — collapsible on mobile, always open on lg+ */}
      <div className={`mt-3 ${isOpen ? "block" : "hidden"} lg:block`}>
        <div className="grid grid-cols-1 gap-3 xsm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <DatePicker
            id="dash-filter-from"
            label={tr.dateFrom}
            placeholder="dd/mm/yyyy"
            value={local.dateFrom}
            onChange={(v) => set("dateFrom", v)}
          />
          <DatePicker
            id="dash-filter-to"
            label={tr.dateTo}
            placeholder="dd/mm/yyyy"
            value={local.dateTo}
            onChange={(v) => set("dateTo", v)}
          />

          {accounts.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{tr.account}</label>
              <select value={local.accountId} onChange={(e) => set("accountId", e.target.value)} className={selectClass}>
                <option value="">{tr.allAccounts}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankProvider} {a.source === "WALLET" ? "(Wallet)" : ""} ***{a.accountNumber.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {categories.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{tr.category}</label>
              <select value={local.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={selectClass}>
                <option value="">{tr.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{tr.txType}</label>
            <select value={local.txType} onChange={(e) => set("txType", e.target.value)} className={selectClass}>
              <option value="">{tr.allTypes}</option>
              <option value="CREDIT">{tr.tabIncome}</option>
              <option value="DEBIT">{tr.tabExpense}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-transparent select-none">_</label>
            <button
              onClick={handleApply}
              disabled={!isDirty}
              className="h-9 w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {tr.apply}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
