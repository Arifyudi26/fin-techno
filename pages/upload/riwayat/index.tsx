import { useEffect, useState } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";
import axiosGlobal from "@/services/AxiosGlobal";
import ProviderIcon from "@components/icons/providers/ProviderIcon";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface UploadItem {
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
}

const statusColor = (s: string) => {
  if (s === "SUCCESS") return "success";
  if (s === "PARTIAL") return "warning";
  if (s === "FAILED") return "error";
  return "info";
};
const statusLabel: Record<string, string> = {
  SUCCESS: "Berhasil", PARTIAL: "Sebagian", FAILED: "Gagal", UPLOADING: "Uploading", PROCESSING: "Proses",
};

const fileFormatColor: Record<string, string> = {
  CSV: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  XLSX: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  XLS: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  PDF: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
};

type FilterType = "ALL" | "BANK" | "WALLET";

export default function UploadRiwayat() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    axiosGlobal.get("/upload/list")
      .then((res) => setUploads(res.data.uploads ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? uploads : uploads.filter((u) => u.sourceType === filter);
  const successCount = uploads.filter((u) => u.status === "SUCCESS").length;
  const partialCount = uploads.filter((u) => u.status === "PARTIAL").length;
  const failedCount  = uploads.filter((u) => u.status === "FAILED").length;

  return (
    <AppLayout>
      <PageMeta title="Riwayat Upload | MyFinance" description="Riwayat Upload e-Statement rekening bank dan dompet digital" />
      <PageBreadcrumb pageTitle="Riwayat Upload" />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Upload</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{loading ? "—" : uploads.length}</p>
        </div>
        <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
          <p className="text-xs text-success-600 dark:text-success-400 mb-1">Berhasil</p>
          <p className="text-2xl font-bold text-success-700 dark:text-success-300">{loading ? "—" : successCount}</p>
        </div>
        <div className="rounded-2xl border border-warning-200 dark:border-warning-500/20 bg-warning-50 dark:bg-warning-500/10 p-4">
          <p className="text-xs text-warning-600 dark:text-warning-400 mb-1">Sebagian</p>
          <p className="text-2xl font-bold text-warning-700 dark:text-warning-300">{loading ? "—" : partialCount}</p>
        </div>
        <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
          <p className="text-xs text-error-600 dark:text-error-400 mb-1">Gagal</p>
          <p className="text-2xl font-bold text-error-700 dark:text-error-300">{loading ? "—" : failedCount}</p>
        </div>
      </div>

      {/* Filter + action */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-900 p-1 w-fit">
          {(["ALL", "BANK", "WALLET"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              {f === "ALL" ? "Semua" : f === "BANK" ? "Bank" : "Dompet Digital"}
            </button>
          ))}
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload Baru
        </Link>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
          <div className="col-span-4 text-xs font-medium text-gray-500 dark:text-gray-400">File & Sumber</div>
          <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400">Periode</div>
          <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Pemasukan</div>
          <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Pengeluaran</div>
          <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">Status</div>
          <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Aksi</div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-2 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada upload</p>
            <Link href="/upload" className="mt-3 inline-block text-sm text-brand-500 hover:text-brand-600">
              Upload sekarang →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((u) => {
              return (
                <div key={u.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  {/* File info */}
                  <div className="sm:col-span-4 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <ProviderIcon provider={u.provider} sourceType={u.sourceType} size={36} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${u.sourceType === "BANK" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"}`}>
                          {u.sourceType === "BANK" ? "Bank" : "Dompet"}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${fileFormatColor[u.fileFormat] ?? "bg-gray-100 text-gray-600"}`}>
                          {u.fileFormat}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{u.fileName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {u.provider} · {u.accountIdentifier} · {formatBytes(u.fileSizeBytes)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{u.uploadedAt.slice(0, 16).replace("T", " ")}</p>
                    </div>
                  </div>

                  {/* Periode */}
                  <div className="sm:col-span-2 sm:flex sm:flex-col sm:justify-center">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{u.periodStart} s/d</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{u.periodEnd}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {u.parsedRows}/{u.totalRows} baris
                      {u.failedRows > 0 && <span className="text-error-500 ml-1">({u.failedRows} gagal)</span>}
                    </p>
                  </div>

                  {/* Credit */}
                  <div className="sm:col-span-2 sm:text-right sm:flex sm:flex-col sm:justify-center">
                    {u.status !== "FAILED" ? (
                      <p className="text-sm font-medium text-success-600 dark:text-success-400">+{formatIDR(u.totalCredit)}</p>
                    ) : <p className="text-sm text-gray-400">—</p>}
                  </div>

                  {/* Debit */}
                  <div className="sm:col-span-2 sm:text-right sm:flex sm:flex-col sm:justify-center">
                    {u.status !== "FAILED" ? (
                      <p className="text-sm font-medium text-error-600 dark:text-error-400">-{formatIDR(u.totalDebit)}</p>
                    ) : <p className="text-sm text-gray-400">—</p>}
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-1 sm:flex sm:items-center sm:justify-center">
                    <Badge size="sm" color={statusColor(u.status)}>
                      {statusLabel[u.status] ?? u.status}
                    </Badge>
                  </div>

                  {/* Action */}
                  <div className="sm:col-span-1 sm:flex sm:items-center sm:justify-end">
                    <Link
                      href={`/upload/riwayat/${u.id}?type=${u.sourceType.toLowerCase()}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                      title="Lihat Detail"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

