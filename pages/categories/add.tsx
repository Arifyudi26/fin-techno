import { useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Label from "@components/form/Label";
import Input from "@components/form/input/InputField";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";

export default function AddCategory() {
  const router = useRouter();
  const { toastState, fire, close } = useToast();
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nama kategori wajib diisi";
    if (!form.code.trim()) e.code = "Kode wajib diisi";
    else if (form.code.length > 5) e.code = "Kode maksimal 5 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await axiosGlobal.post("/categories", { ...form, code: form.code.toUpperCase() });
      fire("success", "Kategori berhasil ditambahkan", { duration: 2000 });
      setTimeout(() => router.push("/categories"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal menyimpan kategori";
      fire("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageMeta title="Tambah Kategori | Fin-Techno" description="Tambah kategori transaksi baru" />
      <PageBreadcrumb pageTitle="Tambah Kategori" />
      <div className="max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Kategori Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Nama Kategori <span className="text-error-500">*</span></Label>
              <Input type="text" placeholder="Contoh: Operasional" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              {errors.name && <p className="mt-1 text-xs text-error-500">{errors.name}</p>}
            </div>
            <div>
              <Label>Kode <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder="Contoh: OPS (maks. 5 karakter)"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().slice(0, 5) }))}
              />
              {errors.code && <p className="mt-1 text-xs text-error-500">{errors.code}</p>}
            </div>
            <div>
              <Label>Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></Label>
              <Input type="text" placeholder="Opsional" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => router.back()} className="flex-1 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                Batal
              </button>
              <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
