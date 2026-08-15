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
import { useI18n } from "@lib/i18n";

const banks = ["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA", "DANAMON", "BTN", "BSI", "OTHER"];

export default function AddBankAccount() {
  const router = useRouter();
  const { toastState, fire, close } = useToast();
  const { t } = useI18n();
  const tr = t.bankAccounts;
  const [form, setForm] = useState({ bankProvider: "", accountNumber: "", accountName: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.bankProvider) e.bankProvider = tr.validationBank;
    if (!form.accountNumber) e.accountNumber = tr.validationAccountNumber;
    if (!form.accountName) e.accountName = tr.validationAccountName;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await axiosGlobal.post("/bank-accounts", form);
      fire("success", tr.saveSuccess, { duration: 2000 });
      setTimeout(() => router.push("/bank-accounts"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? tr.saveError;
      fire("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageMeta title={`${tr.addPageTitle} | Fin-Techno`} description={tr.addPageDescription} />
      <PageBreadcrumb pageTitle={tr.addPageTitle} />
      <div className="max-w-lg">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">{tr.formTitle}</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>{tr.fieldBank} <span className="text-error-500">*</span></Label>
              <select
                value={form.bankProvider}
                onChange={(e) => setForm((p) => ({ ...p, bankProvider: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 dark:bg-gray-900 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/20"
              >
                <option value="">{tr.fieldBankPlaceholder}</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.bankProvider && <p className="mt-1 text-xs text-error-500">{errors.bankProvider}</p>}
            </div>
            <div>
              <Label>{tr.fieldAccountNumber} <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder={tr.fieldAccountNumberPlaceholder}
                value={form.accountNumber}
                onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
              />
              {errors.accountNumber && <p className="mt-1 text-xs text-error-500">{errors.accountNumber}</p>}
            </div>
            <div>
              <Label>{tr.fieldAccountName} <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                placeholder={tr.fieldAccountNamePlaceholder}
                value={form.accountName}
                onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
              />
              {errors.accountName && <p className="mt-1 text-xs text-error-500">{errors.accountName}</p>}
            </div>
            <div>
              <Label>{tr.fieldDescription} <span className="text-gray-400 font-normal">{tr.fieldDescriptionOptional}</span></Label>
              <Input
                type="text"
                placeholder={tr.fieldDescriptionPlaceholder}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {tr.saveBtn}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
