import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Label from "@components/form/Label";
import Input from "@components/form/input/InputField";
import Link from "next/link";

export default function AddCategory() {
  return (
    <AppLayout>
      <PageMeta title="Tambah Kategori | MyFinance" description="Tambah kategori transaksi baru" />
      <PageBreadcrumb pageTitle="Tambah Kategori" />
      <div className="max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Kategori Baru</h3>
          <div className="space-y-5">
            <div>
              <Label>Nama Kategori <span className="text-error-500">*</span></Label>
              <Input type="text" placeholder="Contoh: Operasional" />
            </div>
            <div>
              <Label>Kode <span className="text-error-500">*</span></Label>
              <Input type="text" placeholder="Contoh: OPS (maks. 5 karakter)" />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input type="text" placeholder="Opsional" />
            </div>
            <div className="flex gap-3 pt-2">
              <Link href="/categories" className="flex-1 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                Batal
              </Link>
              <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
