import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";

export default function Reconciliation() {
  return (
    <AppLayout>
      <PageMeta title="Rekonsiliasi | MyFinance" description="Laporan merge dan rekonsiliasi transaksi" />
      <PageBreadcrumb pageTitle="Rekonsiliasi" />
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Laporan Rekonsiliasi</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Halaman ini sedang dalam pengembangan.</p>
      </div>
    </AppLayout>
  );
}
