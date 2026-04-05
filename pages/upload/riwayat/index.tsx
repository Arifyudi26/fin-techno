import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const uploads = [
  {
    id: "1",
    fileName: "mutasi_bca_april2026.csv",
    bank: "BCA",
    accountNumber: "***-7890",
    fileFormat: "CSV",
    fileSize: 24_500,
    period: "Apr 2026",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    status: "SUCCESS",
    totalRows: 48,
    parsedRows: 48,
    failedRows: 0,
    totalCredit: 48_500_000,
    totalDebit: 31_200_000,
    uploadedAt: "2026-04-30 14:22",
    uploadedBy: "Demo User",
  },
  {
    id: "2",
    fileName: "mutasi_bri_april2026.xlsx",
    bank: "BRI",
    accountNumber: "***-4321",
    fileFormat: "XLSX",
    fileSize: 18_200,
    period: "Apr 2026",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    status: "SUCCESS",
    totalRows: 31,
    parsedRows: 31,
    failedRows: 0,
    totalCredit: 21_000_000,
    totalDebit: 18_500_000,
    uploadedAt: "2026-04-29 09:15",
    uploadedBy: "Demo User",
  },
  {
    id: "3",
    fileName: "mutasi_mandiri_maret2026.pdf",
    bank: "Mandiri",
    accountNumber: "***-3455",
    fileFormat: "PDF",
    fileSize: 35_800,
    period: "Mar 2026",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    status: "PARTIAL",
    totalRows: 25,
    parsedRows: 22,
    failedRows: 3,
    totalCredit: 15_000_000,
    totalDebit: 12_000_000,
    uploadedAt: "2026-04-01 11:40",
    uploadedBy: "Demo User",
  },
  {
    id: "4",
    fileName: "mutasi_bni_feb2026.csv",
    bank: "BNI",
    accountNumber: "***-1122",
    fileFormat: "CSV",
    fileSize: 12_100,
    period: "Feb 2026",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    status: "FAILED",
    totalRows: 15,
    parsedRows: 0,
    failedRows: 15,
    totalCredit: 0,
    totalDebit: 0,
    uploadedAt: "2026-03-01 08:05",
    uploadedBy: "Demo User",
  },
];

const statusColor = (s: string) => {
  if (s === "SUCCESS") return "success";
  if (s === "PARTIAL") return "warning";
  if (s === "FAILED") return "error";
  return "info";
};

const statusLabel = (s: string) => {
  if (s === "SUCCESS") return "Berhasil";
  if (s === "PARTIAL") return "Sebagian";
  if (s === "FAILED") return "Gagal";
  return s;
};

const fileFormatColor: Record<string, string> = {
  CSV: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  XLSX: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  XLS: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  PDF: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
};

export default function UploadRiwayat() {
  const successCount = uploads.filter((u) => u.status === "SUCCESS").length;
  const partialCount = uploads.filter((u) => u.status === "PARTIAL").length;
  const failedCount = uploads.filter((u) => u.status === "FAILED").length;

  return (
    <AppLayout>
      <PageMeta
        title="Riwayat Upload | MyFinance"
        description="Riwayat upload e-statement mutasi rekening"
      />
      <PageBreadcrumb pageTitle="Riwayat Upload" />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Total Upload
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {uploads.length}
          </p>
        </div>
        <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
          <p className="text-xs text-success-600 dark:text-success-400 mb-1">
            Berhasil
          </p>
          <p className="text-2xl font-bold text-success-700 dark:text-success-300">
            {successCount}
          </p>
        </div>
        <div className="rounded-2xl border border-warning-200 dark:border-warning-500/20 bg-warning-50 dark:bg-warning-500/10 p-4">
          <p className="text-xs text-warning-600 dark:text-warning-400 mb-1">
            Sebagian
          </p>
          <p className="text-2xl font-bold text-warning-700 dark:text-warning-300">
            {partialCount}
          </p>
        </div>
        <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
          <p className="text-xs text-error-600 dark:text-error-400 mb-1">
            Gagal
          </p>
          <p className="text-2xl font-bold text-error-700 dark:text-error-300">
            {failedCount}
          </p>
        </div>
      </div>

      {/* Header actions */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {uploads.length} file diupload
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Upload Baru
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
          <div className="col-span-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            File
          </div>
          <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Periode
          </div>
          <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
            Pemasukan
          </div>
          <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
            Pengeluaran
          </div>
          <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
            Status
          </div>
          <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
            Aksi
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              {/* File info */}
              <div className="sm:col-span-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <svg
                    className="text-gray-500 dark:text-gray-400"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {u.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${fileFormatColor[u.fileFormat] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {u.fileFormat}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatBytes(u.fileSize)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      · {u.bank} {u.accountNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {u.uploadedAt}
                  </p>
                </div>
              </div>

              {/* Periode */}
              <div className="sm:col-span-2 flex sm:flex-col sm:justify-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {u.period}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 sm:mt-0.5 ml-2 sm:ml-0">
                  {u.parsedRows}/{u.totalRows} baris
                  {u.failedRows > 0 && (
                    <span className="text-error-500 ml-1">
                      ({u.failedRows} gagal)
                    </span>
                  )}
                </p>
              </div>

              {/* Credit */}
              <div className="sm:col-span-2 sm:text-right sm:flex sm:flex-col sm:justify-center">
                {u.status !== "FAILED" ? (
                  <p className="text-sm font-medium text-success-600 dark:text-success-400">
                    +{formatIDR(u.totalCredit)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>

              {/* Debit */}
              <div className="sm:col-span-2 sm:text-right sm:flex sm:flex-col sm:justify-center">
                {u.status !== "FAILED" ? (
                  <p className="text-sm font-medium text-error-600 dark:text-error-400">
                    -{formatIDR(u.totalDebit)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>

              {/* Status */}
              <div className="sm:col-span-1 sm:flex sm:items-center sm:justify-center">
                <Badge size="sm" color={statusColor(u.status)}>
                  {statusLabel(u.status)}
                </Badge>
              </div>

              {/* Action */}
              <div className="sm:col-span-1 sm:flex sm:items-center sm:justify-end">
                <Link
                  href={`/upload/riwayat/${u.id}`}
                  className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
