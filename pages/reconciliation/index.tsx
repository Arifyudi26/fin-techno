import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";

const reports = [
  { id: "1", name: "Rekonsiliasi April 2025", period: "1 Apr – 30 Apr 2025", status: "MERGED", totalCredit: 48_500_000, totalDebit: 31_200_000, txCount: 24, createdAt: "2025-04-30" },
  { id: "2", name: "Rekonsiliasi Maret 2025", period: "1 Mar – 31 Mar 2025", status: "MERGED", totalCredit: 41_000_000, totalDebit: 27_000_000, txCount: 19, createdAt: "2025-03-31" },
  { id: "3", name: "Draft Q1 2025", period: "1 Jan – 31 Mar 2025", status: "DRAFT", totalCredit: 112_000_000, totalDebit: 74_000_000, txCount: 58, createdAt: "2025-04-01" },
  { id: "4", name: "Rekonsiliasi Feb 2025", period: "1 Feb – 28 Feb 2025", status: "CONFLICT", totalCredit: 28_500_000, totalDebit: 19_500_000, txCount: 15, createdAt: "2025-02-28" },
];

const statusColor = (s: string) => {
  if (s === "MERGED") return "success";
  if (s === "DRAFT") return "warning";
  return "error";
};
const statusLabel = (s: string) => {
  if (s === "MERGED") return "Selesai";
  if (s === "DRAFT") return "Draft";
  return "Konflik";
};

export default function Reconciliation() {
  return (
    <AppLayout>
      <PageMeta title="Rekonsiliasi | MyFinance" description="Laporan merge dan rekonsiliasi transaksi" />
      <PageBreadcrumb pageTitle="Rekonsiliasi" />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{reports.length} laporan tersimpan</p>
        <Link
          href="/reconciliation/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Buat Laporan Baru
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {reports.map((r) => (
          <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white/90">{r.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.period}</p>
              </div>
              <Badge size="sm" color={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pemasukan</p>
                <p className="text-sm font-semibold text-success-600 dark:text-success-400">+{(r.totalCredit / 1_000_000).toFixed(0)}jt</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pengeluaran</p>
                <p className="text-sm font-semibold text-error-600 dark:text-error-400">-{(r.totalDebit / 1_000_000).toFixed(0)}jt</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Transaksi</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{r.txCount}x</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">Dibuat: {r.createdAt}</p>
              <div className="flex gap-2">
                <Link href={`/reconciliation/${r.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-500/10 transition-colors" title="Lihat Detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
