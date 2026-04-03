import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";

const uploads = [
  { id: "1", fileName: "mutasi_bca_april2025.csv", bank: "BCA", period: "Apr 2025", status: "SUCCESS", parsedRows: 48, failedRows: 0, totalCredit: 48_500_000, totalDebit: 31_200_000, uploadedAt: "2025-04-30 14:22" },
  { id: "2", fileName: "mutasi_bri_april2025.xlsx", bank: "BRI", period: "Apr 2025", status: "SUCCESS", parsedRows: 31, failedRows: 0, totalCredit: 21_000_000, totalDebit: 18_500_000, uploadedAt: "2025-04-29 09:15" },
  { id: "3", fileName: "mutasi_mandiri_maret2025.pdf", bank: "Mandiri", period: "Mar 2025", status: "PARTIAL", parsedRows: 22, failedRows: 3, totalCredit: 15_000_000, totalDebit: 12_000_000, uploadedAt: "2025-04-01 11:40" },
  { id: "4", fileName: "mutasi_bni_feb2025.csv", bank: "BNI", period: "Feb 2025", status: "FAILED", parsedRows: 0, failedRows: 15, totalCredit: 0, totalDebit: 0, uploadedAt: "2025-03-01 08:05" },
];

const statusColor = (s: string) => {
  if (s === "SUCCESS") return "success";
  if (s === "PARTIAL") return "warning";
  if (s === "FAILED") return "error";
  return "info";
};

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export default function UploadHistory() {
  return (
    <AppLayout>
      <PageMeta title="Riwayat Upload | MyFinance" description="Riwayat upload e-statement" />
      <PageBreadcrumb pageTitle="Riwayat Upload" />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{uploads.length} file diupload</p>
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

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {uploads.map((u) => (
            <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <svg className="text-gray-500 dark:text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{u.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.bank} · {u.period} · {u.uploadedAt}</p>
                  {u.status !== "FAILED" && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {u.parsedRows} baris berhasil{u.failedRows > 0 ? `, ${u.failedRows} gagal` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 sm:shrink-0">
                {u.status === "SUCCESS" || u.status === "PARTIAL" ? (
                  <div className="text-right">
                    <p className="text-xs text-success-600 dark:text-success-400">+{formatIDR(u.totalCredit)}</p>
                    <p className="text-xs text-error-600 dark:text-error-400">-{formatIDR(u.totalDebit)}</p>
                  </div>
                ) : null}
                <Badge size="sm" color={statusColor(u.status)}>{u.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
