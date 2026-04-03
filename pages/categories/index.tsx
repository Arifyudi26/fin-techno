import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.code} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center`}>
              <span className="text-white text-sm font-bold">{cat.code}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-white/90">{cat.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{cat.count} transaksi</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
