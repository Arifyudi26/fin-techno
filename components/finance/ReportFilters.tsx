import { useEffect, useState } from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import type { BankAccountBalance } from "@/lib/types/dashboard";
import type { ReportFilterState } from "@/lib/types/finance";
import DatePicker from "@components/form/DatePicker";

export type { ReportFilterState };

interface Props {
  filters: ReportFilterState;
  onChange: (f: Partial<ReportFilterState>) => void;
  onReset: () => void;
}

const selectCls =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

function formatDateLabel(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return "Semua Periode";
  const fmt = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `Dari ${fmt(dateFrom)}`;
  return `Sampai ${fmt(dateTo)}`;
}

export default function ReportFilters({ filters, onChange, onReset }: Props) {
  const [accounts, setAccounts] = useState<BankAccountBalance[]>([]);
  const [local, setLocal] = useState({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    accountId: filters.accountId ?? "",
  });

  useEffect(() => {
    axiosGlobal.get("/dashboard/accounts").then((r) => setAccounts(r.data)).catch(() => {});
  }, []);

  // Sync saat parent reset
  useEffect(() => {
    setLocal({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId ?? "",
    });
  }, [filters.dateFrom, filters.dateTo, filters.accountId]);

  const set = (key: keyof typeof local, val: string) =>
    setLocal((prev) => ({ ...prev, [key]: val }));

  const handleApply = () => {
    const acc = accounts.find((a) => a.id === local.accountId);
    onChange({
      dateFrom: local.dateFrom,
      dateTo: local.dateTo,
      accountId: local.accountId || null,
      accountType: local.accountId ? (acc?.source ?? null) : null,
    });
  };

  const handleReset = () => {
    setLocal({ dateFrom: getDefaultFrom(), dateTo: getDefaultTo(), accountId: "" });
    onReset();
  };

  const isDirty =
    local.dateFrom !== filters.dateFrom ||
    local.dateTo !== filters.dateTo ||
    (local.accountId || null) !== filters.accountId;

  const hasFilter =
    filters.accountId != null ||
    filters.dateFrom !== getDefaultFrom() ||
    filters.dateTo !== getDefaultTo();

  const activePeriodLabel = formatDateLabel(filters.dateFrom, filters.dateTo);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03] mb-6">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {activePeriodLabel}
          </span>
        </div>
        {hasFilter && (
          <button
            onClick={handleReset}
            className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Filter grid */}
      <div className={`grid gap-3 grid-cols-2 ${accounts.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="flex h-[52px] flex-col justify-end gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Dari Tanggal</label>
          <DatePicker
            id="report-filter-from"
            placeholder="dd/mm/yyyy"
            value={local.dateFrom}
            onChange={(v) => set("dateFrom", v)}
          />
        </div>

        <div className="flex h-[52px] flex-col justify-end gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
          <DatePicker
            id="report-filter-to"
            placeholder="dd/mm/yyyy"
            value={local.dateTo}
            onChange={(v) => set("dateTo", v)}
          />
        </div>

        {/* Rekening */}
        {accounts.length > 0 && (
          <div className="flex h-[52px] flex-col justify-end gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rekening</label>
            <select value={local.accountId} onChange={(e) => set("accountId", e.target.value)} className={selectCls}>
              <option value="">Semua Rekening</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankProvider} {a.source === "WALLET" ? "(Wallet)" : ""} ***{a.accountNumber.slice(-4)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tombol Apply */}
        <div className="flex h-[52px] flex-col justify-end">
          <button
            onClick={handleApply}
            disabled={!isDirty}
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

function getDefaultFrom(): string {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
}

function getDefaultTo(): string {
  return new Date().toISOString().split("T")[0];
}
