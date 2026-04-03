import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Label from "@components/form/Label";
import Input from "@components/form/input/InputField";

const banks = ["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA", "DANAMON", "BTN", "BSI", "OTHER"];

export default function AddBankAccount() {
  return (
    <AppLayout>
      <PageMeta title="Tambah Rekening | MyFinance" description="Daftarkan rekening bank baru" />
      <PageBreadcrumb pageTitle="Tambah Rekening" />
      <div className="max-w-lg">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Informasi Rekening</h3>
          <div className="space-y-5">
            <div>
              <Label>Bank <span className="text-error-500">*</span></Label>
              <select className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 dark:bg-gray-900 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/20">
                <option value="">Pilih Bank</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <Label>Nomor Rekening <span className="text-error-500">*</span></Label>
              <Input type="text" placeholder="Contoh: 1234567890" />
            </div>
            <div>
              <Label>Nama Pemilik Rekening <span className="text-error-500">*</span></Label>
              <Input type="text" placeholder="Sesuai buku tabungan" />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input type="text" placeholder="Opsional — contoh: Rekening Operasional" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                Batal
              </button>
              <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                Simpan Rekening
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
