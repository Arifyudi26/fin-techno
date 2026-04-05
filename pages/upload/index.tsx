import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";

export default function Upload() {
  return (
    <AppLayout>
      <PageMeta title="Upload E-Statement | MyFinance" description="Upload file mutasi rekening bank" />
      <PageBreadcrumb pageTitle="Upload E-Statement" />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload file mutasi rekening bank kamu untuk diproses
        </p>
        <Link
          href="/upload/riwayat"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Lihat Riwayat Upload
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Upload area */}
      <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-12 text-center hover:border-brand-400 dark:hover:border-brand-500/50 transition-colors">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#465FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          Drag & Drop File di Sini
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          Upload file mutasi rekening bank kamu. Sistem akan otomatis memproses dan mengkategorikan transaksi.
        </p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Pilih File
        </button>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Format: CSV, XLSX, XLS, PDF · Maks. 10MB per file
        </p>
      </div>

      {/* Info cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-success-50 dark:bg-success-500/10">
            <svg className="text-success-500" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">Auto Parsing</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sistem otomatis membaca dan memproses data transaksi dari file</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <svg className="text-brand-500" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">Auto Kategorisasi</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Transaksi otomatis dikategorikan berdasarkan deskripsi</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50 dark:bg-warning-500/10">
            <svg className="text-warning-500" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">Deteksi Duplikat</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sistem mendeteksi dan menandai transaksi duplikat otomatis</p>
        </div>
      </div>
    </AppLayout>
  );
}
