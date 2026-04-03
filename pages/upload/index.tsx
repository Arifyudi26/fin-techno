import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";

export default function Upload() {
  return (
    <AppLayout>
      <PageMeta title="Upload E-Statement | MyFinance" description="Upload file mutasi rekening bank" />
      <PageBreadcrumb pageTitle="Upload E-Statement" />
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#465FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Upload E-Statement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Drag & drop file CSV, XLSX, atau PDF mutasi rekening bank kamu di sini</p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          Pilih File
        </button>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Format yang didukung: CSV, XLSX, XLS, PDF — Maks. 10MB</p>
      </div>
    </AppLayout>
  );
}
