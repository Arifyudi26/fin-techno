import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@components/ui/table";
import Pagination from "@components/ui/pagination/Pagination";
import axiosGlobal from "@/services/AxiosGlobal";
import { fmtDate } from "@/lib/utils";
import ProviderIcon from "@components/icons/providers/ProviderIcon";
import { formatBytes, fmtIDR as formatIDR } from "@lib/formatters";
import { useI18n } from "@lib/i18n";

interface UploadDetail {
  id: string;
  sourceType: "BANK" | "WALLET";
  provider: string;
  accountIdentifier: string;
  accountName: string;
  fileName: string;
  fileFormat: string;
  fileSizeBytes: number | null;
  periodStart: string;
  periodEnd: string;
  status: string;
  errorMessage?: string;
  totalRows: number;
  parsedRows: number;
  failedRows: number;
  totalCredit: number;
  totalDebit: number;
  uploadedAt: string;
  uploadedBy: string;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    reference?: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    balance: number | null;
    category: string;
    status: string;
  }>;
}

const statusColor = (s: string) => {
  if (s === "SUCCESS" || s === "VERIFIED") return "success";
  if (s === "PARTIAL" || s === "PENDING") return "warning";
  if (s === "FAILED" || s === "REJECTED") return "error";
  return "info";
};
export default function UploadDetail() {
  const router = useRouter();
  const { t } = useI18n();
  const tr = t.upload;
  const statusLabel: Record<string, string> = {
    SUCCESS: tr.statusSuccess, PARTIAL: tr.statusPartial, FAILED: tr.statusFailed,
    VERIFIED: tr.statusVerified, PENDING: tr.statusPending, REJECTED: tr.statusRejected,
  };
  const { id, type } = router.query;
  const [upload, setUpload] = useState<UploadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);

  useEffect(() => {
    if (!id) return;
    axiosGlobal.get(`/upload/${id}?type=${type ?? "bank"}`)
      .then((res) => setUpload(res.data))
      .catch(() => setError(tr.uploadDataNotFound))
      .finally(() => setLoading(false));
  }, [id, type, tr.uploadDataNotFound]);

  if (loading) {
    return (
      <AppLayout>
        <PageMeta title={`${tr.detailTitle} | Fin-Techno`} description="" />
        <PageBreadcrumb pageTitle={tr.detailTitle} />
        <div className="space-y-4 animate-pulse">
          <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
          </div>
          <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </AppLayout>
    );
  }

  if (error || !upload) {
    return (
      <AppLayout>
        <PageMeta title={`${tr.detailTitle} | Fin-Techno`} description="" />
        <PageBreadcrumb pageTitle={tr.detailTitle} />
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{error ?? tr.dataNotFound}</p>
          <Link href="/upload/riwayat" className="mt-4 inline-block text-sm text-brand-500 hover:text-brand-600">
            ← {tr.backToHistory}
          </Link>
        </div>
      </AppLayout>
    );
  }

  const netFlow = upload.totalCredit - upload.totalDebit;
  const successRate = upload.totalRows > 0 ? Math.round((upload.parsedRows / upload.totalRows) * 100) : 0;
  const txTotal = upload.transactions.length;
  const txTotalPages = Math.ceil(txTotal / txLimit);
  const pagedTx = upload.transactions.slice((txPage - 1) * txLimit, txPage * txLimit);

  return (
    <AppLayout>
      <PageMeta title={`${tr.detailTitle} — ${upload.fileName} | Fin-Techno`} description={tr.detailDescription} />
      <PageBreadcrumb pageTitle={tr.detailTitle} />

      {/* Back */}
      <div className="mb-5">
        <Link href="/upload/riwayat" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tr.backToHistory}
        </Link>
      </div>

      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <ProviderIcon provider={upload.provider} sourceType={upload.sourceType} size={48} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${upload.sourceType === "BANK" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"}`}>
                  {upload.sourceType === "BANK" ? tr.bankLabel : tr.walletLabel}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{upload.provider}</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{upload.fileName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">{upload.accountName} · {upload.accountIdentifier}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{upload.fileFormat} · {formatBytes(upload.fileSizeBytes)}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(upload.uploadedAt)}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{tr.by} {upload.uploadedBy}</span>
              </div>
            </div>
          </div>
          <Badge size="sm" color={statusColor(upload.status)}>
            {statusLabel[upload.status] ?? upload.status}
          </Badge>
        </div>

        {upload.errorMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 dark:border-warning-500/20 dark:bg-warning-500/10 px-4 py-3">
            <svg className="mt-0.5 shrink-0 text-warning-500" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-warning-700 dark:text-warning-400">{upload.errorMessage}</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: tr.colPeriod, value: `${fmtDate(upload.periodStart)}`, sub: `${tr.periodUntil} ${fmtDate(upload.periodEnd)}` },
          { label: tr.metaTotalRows, value: String(upload.totalRows), sub: `${tr.metaSuccessRate}: ${successRate}%` },
          { label: tr.metaSuccess, value: String(upload.parsedRows), sub: tr.metaSuccessSub, valueClass: "text-success-600 dark:text-success-400" },
          { label: tr.metaFailed, value: String(upload.failedRows), sub: tr.metaFailedSub, valueClass: upload.failedRows > 0 ? "text-error-600 dark:text-error-400" : "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-sm font-semibold ${s.valueClass ?? "text-gray-800 dark:text-white/90"}`}>{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
          <p className="text-xs text-success-600 dark:text-success-400 mb-1">{tr.metaTotalIn}</p>
          <p className="text-sm font-bold text-success-700 dark:text-success-300">{formatIDR(upload.totalCredit)}</p>
        </div>
        <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
          <p className="text-xs text-error-600 dark:text-error-400 mb-1">{tr.metaTotalOut}</p>
          <p className="text-sm font-bold text-error-700 dark:text-error-300">{formatIDR(upload.totalDebit)}</p>
        </div>
      </div>

      {/* Net flow */}
      <div className={`mb-6 rounded-xl border px-5 py-4 ${netFlow >= 0 ? "border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10" : "border-error-200 bg-error-50 dark:border-error-500/20 dark:bg-error-500/10"}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${netFlow >= 0 ? "text-brand-700 dark:text-brand-300" : "text-error-700 dark:text-error-300"}`}>
            {tr.netFlowPeriod}
          </p>
          <p className={`text-lg font-bold ${netFlow >= 0 ? "text-brand-700 dark:text-brand-300" : "text-error-700 dark:text-error-300"}`}>
            {netFlow >= 0 ? "+" : ""}{formatIDR(netFlow)}
          </p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{tr.txFromUpload}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{txTotal} {tr.txLabel.toLowerCase()}</p>
          </div>
        </div>
        {txTotal === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            {tr.noTxProcessed}
          </div>
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                <TableRow>
                  <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colDate}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colDescription}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colReference}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colCategory}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colAmount}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colBalance}</TableCell>
                  <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{tr.colStatus}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pagedTx.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="py-3 px-5 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">{fmtDate(tx.date)}</TableCell>
                    <TableCell className="py-3">
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 max-w-[220px] truncate">{tx.description}</p>
                    </TableCell>
                    <TableCell className="py-3 text-gray-400 text-theme-xs dark:text-gray-500">{tx.reference ?? "—"}</TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{tx.category}</TableCell>
                    <TableCell className="py-3">
                      <span className={`font-semibold text-theme-sm ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}{formatIDR(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                      {tx.balance !== null ? formatIDR(tx.balance) : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={statusColor(tx.status)}>
                        {statusLabel[tx.status] ?? tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
            <Pagination page={txPage} totalPages={txTotalPages} total={txTotal} limit={txLimit} onPageChange={setTxPage} onLimitChange={(l) => { setTxLimit(l); setTxPage(1); }} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
