import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const accounts = [
  {
    id: "1",
    bank: "BCA",
    accountNumber: "1234567890",
    accountName: "PT Maju Jaya",
    currency: "IDR",
    lastBalance: 48_250_000,
    lastUploadDate: "2025-04-28",
    lastPeriod: "April 2025",
    totalUploads: 12,
    totalCredit: 580_000_000,
    totalDebit: 531_750_000,
    isActive: true,
    color: "bg-blue-500",
  },
  {
    id: "2",
    bank: "BRI",
    accountNumber: "0987654321",
    accountName: "PT Maju Jaya",
    currency: "IDR",
    lastBalance: 12_800_000,
    lastUploadDate: "2025-04-25",
    lastPeriod: "April 2025",
    totalUploads: 8,
    totalCredit: 210_000_000,
    totalDebit: 197_200_000,
    isActive: true,
    color: "bg-brand-500",
  },
  {
    id: "3",
    bank: "Mandiri",
    accountNumber: "1122334455",
    accountName: "PT Maju Jaya",
    currency: "IDR",
    lastBalance: 31_500_000,
    lastUploadDate: "2025-04-20",
    lastPeriod: "Maret 2025",
    totalUploads: 5,
    totalCredit: 145_000_000,
    totalDebit: 113_500_000,
    isActive: false,
    color: "bg-warning-500",
  },
];

export default function BankAccounts() {
  const totalLastBalance = accounts.filter((a) => a.isActive).reduce((s, a) => s + a.lastBalance, 0);

  return (
    <AppLayout>
      <PageMeta title="Rekening Bank | MyFinance" description="Kelola rekening bank yang terhubung" />
      <PageBreadcrumb pageTitle="Rekening Bank" />

      {/* Summary bar */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Rekening Aktif</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{accounts.filter((a) => a.isActive).length}</p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10 sm:col-span-2">
          <p className="text-sm text-brand-600 dark:text-brand-400 mb-1">
            Total Saldo Terakhir Upload
            <span className="ml-2 text-xs font-normal text-brand-400 dark:text-brand-500">(bukan saldo real-time)</span>
          </p>
          <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{formatIDR(totalLastBalance)}</p>
        </div>
      </div>

      {/* Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
        <svg className="mt-0.5 shrink-0 text-warning-500" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm text-warning-700 dark:text-warning-400">
          <span className="font-semibold">Perhatian:</span> Saldo yang ditampilkan adalah saldo akhir dari e-statement terakhir yang diupload, bukan saldo rekening saat ini. Aplikasi ini tidak terintegrasi langsung dengan sistem perbankan.
        </p>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {accounts.map((acc) => (
          <div key={acc.id} className={`rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden ${acc.isActive ? "border-gray-200 dark:border-gray-800" : "border-gray-100 dark:border-gray-800/50 opacity-70"}`}>
            {/* Card header */}
            <div className={`${acc.color} px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{acc.bank}</span>
                </div>
                <div>
                  <p className="font-semibold text-white">{acc.accountName}</p>
                  <p className="text-xs text-white/70">{acc.accountNumber}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${acc.isActive ? "bg-white/20 text-white" : "bg-black/20 text-white/70"}`}>
                {acc.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            {/* Card body */}
            <div className="p-5">
              {/* Last balance */}
              <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  Saldo Akhir Upload
                  <span className="ml-1 text-gray-400 dark:text-gray-500">· {acc.lastPeriod}</span>
                </p>
                <p className="text-xl font-bold text-gray-800 dark:text-white/90">{formatIDR(acc.lastBalance)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Diupload: {acc.lastUploadDate}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Upload</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{acc.totalUploads}x</p>
                </div>
                <div className="text-center border-x border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-success-600 dark:text-success-400 mb-0.5">Total Masuk</p>
                  <p className="text-sm font-semibold text-success-600 dark:text-success-400">
                    {(acc.totalCredit / 1_000_000).toFixed(0)}jt
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-error-600 dark:text-error-400 mb-0.5">Total Keluar</p>
                  <p className="text-sm font-semibold text-error-600 dark:text-error-400">
                    {(acc.totalDebit / 1_000_000).toFixed(0)}jt
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/bank-accounts/${acc.id}`}
                  className="flex-1 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                >
                  Detail
                </Link>
                <Link
                  href={`/upload?account=${acc.id}`}
                  className="flex-1 text-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                >
                  Upload Mutasi
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Add account card */}
        <Link
          href="/bank-accounts/add"
          className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5 flex flex-col items-center justify-center gap-3 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-colors min-h-[280px]"
        >
          <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="#465FFF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-700 dark:text-gray-300">Tambah Rekening</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Daftarkan rekening bank baru</p>
          </div>
        </Link>
      </div>
    </AppLayout>
  );
}
