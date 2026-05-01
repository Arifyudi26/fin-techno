import { useState, useEffect, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import BankProviderIcon from "@components/icons/providers/BankIcon";
import { useI18n } from "@lib/i18n";
import { fmtIDR as formatIDR } from "@lib/formatters";

interface BankAccount {
  id: string;
  bankProvider: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  description: string | null;
  isActive: boolean;
  totalUploads: number;
  totalTransactions: number;
  totalCredit: number;
  totalDebit: number;
  lastUploadDate: string | null;
  lastPeriodEnd: string | null;
  lastBalance: number;
}

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toastState, fire, confirm, close } = useToast();
  const { t } = useI18n();
  const tr = t.bankAccounts;

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosGlobal.get("/bank-accounts");
      setAccounts(res.data.accounts);
    } catch {
      fire("error", tr.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [fire, tr]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleToggleActive = async (acc: BankAccount) => {
    const ok = await confirm("warning", acc.isActive ? tr.confirmDeactivate : tr.confirmActivate, {
      message: `${acc.bankProvider} · ${acc.accountNumber}`,
      confirmText: acc.isActive ? tr.confirmDeactivate.replace("?", "") : tr.confirmActivate.replace("?", ""),
      cancelText: t.common.cancel,
    });
    if (!ok) return;
    try {
      await axiosGlobal.put(`/bank-accounts/${acc.id}`, { isActive: !acc.isActive });
      fire("success", acc.isActive ? tr.deactivated : tr.activated, { duration: 3000 });
      fetchAccounts();
    } catch {
      fire("error", tr.errorToggle);
    }
  };

  const handleDelete = async (acc: BankAccount) => {
    const hasHistory = acc.totalTransactions > 0 || acc.totalUploads > 0;
    const ok = await confirm("error", tr.confirmDelete, {
      message: hasHistory
        ? `${acc.bankProvider} · ${acc.accountNumber} ${tr.deleteWithHistory.replace("{tx}", String(acc.totalTransactions)).replace("{up}", String(acc.totalUploads))}`
        : `${acc.bankProvider} · ${acc.accountNumber} ${tr.deleteNoHistory}`,
      confirmText: t.common.delete,
      cancelText: t.common.cancel,
    });
    if (!ok) return;
    try {
      await axiosGlobal.delete(`/bank-accounts/${acc.id}`);
      fire("success", tr.deleted, { duration: 3000 });
      fetchAccounts();
    } catch {
      fire("error", tr.errorDelete);
    }
  };

  const activeAccounts = accounts.filter((a) => a.isActive);
  const totalBalance = activeAccounts.reduce((s, a) => s + a.lastBalance, 0);

  return (
    <AppLayout>
      <PageMeta title={`${tr.pageTitle} | Fin-Techno`} description={tr.description} />
      <PageBreadcrumb pageTitle={tr.pageTitle} />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{tr.totalActive}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{loading ? "—" : activeAccounts.length}</p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10 sm:col-span-2">
          <p className="text-sm text-brand-600 dark:text-brand-400 mb-1">
            {tr.estimatedBalance}
            <span className="ml-2 text-xs font-normal text-brand-400">{tr.estimatedBalanceNote}</span>
          </p>
          <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{loading ? "—" : formatIDR(totalBalance)}</p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
        <svg className="mt-0.5 shrink-0 text-warning-500" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm text-warning-700 dark:text-warning-400">{tr.balanceWarning}</p>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700" />
              <div className="p-5 space-y-3">
                <div className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="grid grid-cols-3 gap-3"><div className="h-10 rounded bg-gray-100 dark:bg-gray-800" /><div className="h-10 rounded bg-gray-100 dark:bg-gray-800" /><div className="h-10 rounded bg-gray-100 dark:bg-gray-800" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => (
            <div key={acc.id} className={`rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden transition-opacity ${acc.isActive ? "border-gray-200 dark:border-gray-800" : "border-gray-100 dark:border-gray-800/50 opacity-60"}`}>
              <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BankProviderIcon provider={acc.bankProvider} size={40} />
                  <div>
                    <p className="font-semibold text-white">{acc.accountName}</p>
                    <p className="text-xs text-white/70">{acc.accountNumber}</p>
                  </div>
                </div>
                <Badge size="sm" color={acc.isActive ? "success" : "light"}>{acc.isActive ? "Aktif" : "Nonaktif"}</Badge>
              </div>
              <div className="p-5">
                <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    {tr.estimatedBalanceLabel}
                    {acc.lastPeriodEnd && <span className="ml-1 text-gray-400">· {tr.periodUntil} {acc.lastPeriodEnd}</span>}
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white/90">{formatIDR(acc.lastBalance)}</p>
                  {acc.lastUploadDate && (
                    <p className="text-xs text-gray-400 mt-0.5">{tr.lastUpload}: {new Date(acc.lastUploadDate).toLocaleDateString("id-ID")}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{tr.uploadCount}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{acc.totalUploads}x</p>
                  </div>
                  <div className="text-center border-x border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-success-600 dark:text-success-400 mb-0.5">Masuk</p>
                    <p className="text-sm font-semibold text-success-600 dark:text-success-400">{(acc.totalCredit / 1_000_000).toFixed(0)}jt</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-error-600 dark:text-error-400 mb-0.5">Keluar</p>
                    <p className="text-sm font-semibold text-error-600 dark:text-error-400">{(acc.totalDebit / 1_000_000).toFixed(0)}jt</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(acc)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                  >
                    {acc.isActive ? tr.confirmDeactivate.replace("?", "") : tr.confirmActivate.replace("?", "")}
                  </button>
                  {acc.isActive ? (
                    <Link
                      href={`/upload?account=${acc.id}`}
                      className="flex-1 text-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                    >
                      {t.upload.uploadBtn}
                    </Link>
                  ) : (
                    <span
                      title={tr.uploadDisabledTitle}
                      className="flex-1 text-center rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    >
                      {t.upload.uploadBtn}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(acc)}
                    title="Hapus rekening"
                    className="inline-flex items-center justify-center rounded-lg border border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 px-2.5 py-2 text-error-500 hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/bank-accounts/add"
            className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5 flex flex-col items-center justify-center gap-3 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-colors min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#465FFF" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700 dark:text-gray-300">{tr.addAccount}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tr.addAccountDesc}</p>
            </div>
          </Link>
        </div>
      )}

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
