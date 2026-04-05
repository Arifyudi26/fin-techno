import { useState, useEffect, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";

const formatIDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

interface Report {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "MERGED" | "CONFLICT";
  totalCredit: number;
  totalDebit: number;
  netFlow: number;
  txCount: number;
  createdAt: string;
}

const statusColor = (s: string) => s === "MERGED" ? "success" : s === "DRAFT" ? "warning" : "error";
const statusLabel = (s: string) => s === "MERGED" ? "Selesai" : s === "DRAFT" ? "Draft" : "Konflik";

export default function Reconciliation() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toastState, fire, confirm, close } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosGlobal.get("/reconciliation");
      setReports(res.data.reports);
    } catch {
      fire("error", "Gagal memuat laporan rekonsiliasi");
    } finally {
      setLoading(false);
    }
  }, [fire]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = async (r: Report) => {
    const ok = await confirm("error", "Hapus Laporan?", {
      message: `"${r.name}" akan dihapus permanen.`,
      confirmText: "Hapus",
      cancelText: "Batal",
    });
    if (!ok) return;
    try {
      await axiosGlobal.delete(`/reconciliation/${r.id}`);
      fire("success", "Laporan dihapus", { duration: 2000 });
      fetchReports();
    } catch {
      fire("error", "Gagal menghapus laporan");
    }
  };

  const handleMerge = async (r: Report) => {
    try {
      await axiosGlobal.put(`/reconciliation/${r.id}`, { status: "MERGED" });
      fire("success", "Laporan ditandai selesai", { duration: 2000 });
      fetchReports();
    } catch {
      fire("error", "Gagal memperbarui status");
    }
  };

  return (
    <AppLayout>
      <PageMeta title="Rekonsiliasi | MyFinance" description="Laporan merge dan rekonsiliasi transaksi" />
      <PageBreadcrumb pageTitle="Rekonsiliasi" />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? "..." : `${reports.length} laporan tersimpan`}</p>
        <Link
          href="/reconciliation/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Buat Laporan Baru
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Belum ada laporan</p>
          <p className="text-sm text-gray-400 mb-5">Buat laporan rekonsiliasi pertama Anda</p>
          <Link href="/reconciliation/create" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Buat Laporan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90">{r.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.periodStart} – {r.periodEnd}</p>
                </div>
                <Badge size="sm" color={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pemasukan</p>
                  <p className="text-sm font-semibold text-success-600 dark:text-success-400">+{formatIDR(r.totalCredit)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pengeluaran</p>
                  <p className="text-sm font-semibold text-error-600 dark:text-error-400">-{formatIDR(r.totalDebit)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Transaksi</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{r.txCount}x</p>
                </div>
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-lg mb-4 ${r.netFlow >= 0 ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
                <span className="text-xs text-gray-500 dark:text-gray-400">Net Flow</span>
                <span className={`text-sm font-bold ${r.netFlow >= 0 ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}`}>
                  {r.netFlow >= 0 ? "+" : ""}{formatIDR(r.netFlow)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">Dibuat: {r.createdAt}</p>
                <div className="flex gap-1">
                  {r.status === "DRAFT" && (
                    <button
                      onClick={() => handleMerge(r)}
                      className="px-3 py-1.5 rounded-lg bg-success-50 dark:bg-success-500/10 text-xs font-medium text-success-600 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors"
                    >
                      Selesaikan
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
