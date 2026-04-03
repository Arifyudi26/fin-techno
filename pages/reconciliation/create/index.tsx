import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";

export default function CreateReconciliation() {
  return (
    <AppLayout>
      <PageMeta title="Buat Laporan Rekonsiliasi | MyFinance" description="Buat laporan merge rekonsiliasi baru" />
      <PageBreadcrumb pageTitle="Buat Laporan Rekonsiliasi" />
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Halaman sedang dalam pengembangan.</p>
      </div>
    </AppLayout>
  );
}
