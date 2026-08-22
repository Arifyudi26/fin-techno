import { useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@components/ui/table";
import Badge from "@components/ui/badge/Badge";
import { RecentTransaction } from "@/lib/types/dashboard";
import { fmtDate } from "@/lib/utils";
import { fmtIDR as fmt } from "@lib/formatters";
import { useI18n } from "@lib/i18n";

interface Props {
  data?: RecentTransaction[];
  loading?: boolean;
}

export default function RecentTransactions({ data = [], loading }: Props) {
  const { t } = useI18n();
  const tr = t.dashboard;

  const [localType, setLocalType] = useState<"" | "CREDIT" | "DEBIT">("");

  const filtered = data.filter((tx) => {
    if (localType && tx.type !== localType) return false;
    return true;
  });

  const totalCredit = filtered.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalDebit = filtered.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tr.recentTitle}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {filtered.length} {tr.colDesc.toLowerCase()} ·{" "}
              <span className="text-success-600 font-medium">+{fmt(totalCredit)}</span>
              {" · "}
              <span className="text-error-600 font-medium">-{fmt(totalDebit)}</span>
            </p>
          </div>
          <Link
            href="/transactions"
            className="self-start inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            {tr.viewAll}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-fit">
          {(["", "CREDIT", "DEBIT"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setLocalType(type)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                localType === type
                  ? "bg-brand-500 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {type === "" ? tr.filterAll : type === "CREDIT" ? tr.filterIn : tr.filterOut}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{tr.noTx}</p>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 sm:hidden">
            {filtered.map((tx) => (
              <div key={tx.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{tx.description}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(tx.date)}</span>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{tx.bankAccount}</span>
                  </div>
                  {tx.categories && tx.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tx.categories.slice(0, 2).map((c) => (
                        <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-semibold ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                    {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                  <Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>
                    {tx.status === "VERIFIED" ? tr.statusVerified : tr.statusPending}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                <TableRow>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colDate}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colDesc}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colAccount}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colCategory}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">{tr.colAmount}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colStatus}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">{fmtDate(tx.date)}</TableCell>
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
                        {tx.status === "VERIFIED" ? tr.statusVerified : tr.statusPending}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
