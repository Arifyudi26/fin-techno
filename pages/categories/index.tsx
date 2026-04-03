import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";

const categories = [
  { name: "Operasional", code: "OPS", count: 42, color: "bg-brand-500" },
  { name: "Gaji", code: "GAJ", count: 12, color: "bg-success-500" },
  { name: "Pajak", code: "PAJ", count: 8, color: "bg-warning-500" },
  { name: "Utilitas", code: "UTL", count: 15, color: "bg-error-500" },
  { name: "Investasi", code: "INV", count: 6, color: "bg-purple-500" },
  { name: "Lainnya", code: "LNY", count: 31, color: "bg-gray-400" },
];

export default function Categories() {
  return (
    <AppLayout>
      <PageMeta title="Kategori Transaksi | MyFinance" description="Kelola kategori transaksi keuangan" />
      <PageBreadcrumb pageTitle="Kategori Transaksi" />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{categories.length} kategori</p>
        <Link
          href="/categories/add"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Tambah Kategori
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.code} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">{cat.code}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white/90">{cat.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{cat.count} transaksi</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
