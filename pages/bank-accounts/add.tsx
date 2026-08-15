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

// Config format per bank
// segments: ukuran tiap grup digit
// maxDigits: total digit yang diizinkan (0 = bebas)
type BankFormat = {
  maxDigits: number;
  segments: number[];
  placeholder: string;
};

const BANK_FORMATS: Record<string, BankFormat> = {
  BCA: { maxDigits: 10, segments: [3, 3, 4], placeholder: "XXX-XXX-XXXX" },
  BNI: { maxDigits: 10, segments: [3, 3, 4], placeholder: "XXX-XXX-XXXX" },
  BRI: { maxDigits: 15, segments: [4, 4, 7], placeholder: "XXXX-XXXX-XXXXXXX" },
  MANDIRI: { maxDigits: 13, segments: [3, 2, 8], placeholder: "XXX-XX-XXXXXXXX" },
  CIMB: { maxDigits: 13, segments: [4, 4, 5], placeholder: "XXXX-XXXX-XXXXX" },
  PERMATA: { maxDigits: 10, segments: [10], placeholder: "XXXXXXXXXX" },
  DANAMON: { maxDigits: 10, segments: [10], placeholder: "XXXXXXXXXX" },
  BTN: { maxDigits: 13, segments: [5, 6, 2], placeholder: "XXXXX-XXXXXX-XX" },
  BSI: { maxDigits: 10, segments: [3, 7], placeholder: "XXX-XXXXXXX" },
  OTHER: { maxDigits: 0, segments: [], placeholder: "" },
};

function formatAccountNumber(digits: string, bank: string): string {
  const fmt = BANK_FORMATS[bank];
  if (!fmt || fmt.segments.length === 0) return digits;

  const parts: string[] = [];
  let pos = 0;
  for (const len of fmt.segments) {
    const chunk = digits.slice(pos, pos + len);
    if (!chunk) break;
    parts.push(chunk);
    pos += len;
  }
  return parts.join("-");
}

export default function AddBankAccount() {
  const router = useRouter();
  const { toastState, fire, close } = useToast();
  const { t } = useI18n();
  const tr = t.bankAccounts;
  const [form, setForm] = useState({ bankProvider: "", accountNumber: "", accountName: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bankKey = form.bankProvider.toUpperCase();
  const bankFmt = BANK_FORMATS[bankKey] ?? null;
  const bankSelected = !!form.bankProvider;

  const displayAccountNumber = bankFmt
    ? formatAccountNumber(form.accountNumber, bankKey)
    : form.accountNumber;

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Reset account number saat ganti bank
    setForm((p) => ({ ...p, bankProvider: e.target.value, accountNumber: "" }));
    setErrors((p) => ({ ...p, bankProvider: "", accountNumber: "" }));
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bankFmt) return;
    const raw = bankFmt.maxDigits > 0
      ? e.target.value.replace(/\D/g, "").slice(0, bankFmt.maxDigits)
      : e.target.value.replace(/\D/g, "");
    setForm((p) => ({ ...p, accountNumber: raw }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.bankProvider) e.bankProvider = tr.validationBank;
    if (!form.accountNumber) {
      e.accountNumber = tr.validationAccountNumber;
    } else if (bankFmt && bankFmt.maxDigits > 0 && form.accountNumber.length !== bankFmt.maxDigits) {
      e.accountNumber = tr.validationAccountDigits
        .replace("{bank}", bankKey)
        .replace("{digits}", String(bankFmt.maxDigits));
    }
    if (!form.accountName) e.accountName = tr.validationAccountName;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

            {/* Bank Provider */}
            <div>
              <Label>{tr.fieldBank} <span className="text-error-500">*</span></Label>
              <select
                value={form.bankProvider}
                onChange={handleBankChange}
                className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 dark:bg-gray-900 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/20"
              >
                <option value="">{tr.fieldBankPlaceholder}</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.bankProvider && <p className="mt-1 text-xs text-error-500">{errors.bankProvider}</p>}
            </div>

            {/* Account Number */}
            <div>
              <Label>
                {tr.fieldAccountNumber} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                disabled={!bankSelected}
                placeholder={bankFmt ? bankFmt.placeholder : tr.accountNumberDisabledPlaceholder}
                value={displayAccountNumber}
                onChange={handleAccountNumberChange}
                className={!bankSelected ? "cursor-not-allowed opacity-50" : ""}
              />
              {bankSelected && bankKey !== "OTHER" && tr.bankHints[bankKey as keyof typeof tr.bankHints] && (
                <p className="mt-1 text-xs text-gray-400">
                  {tr.bankHints[bankKey as keyof typeof tr.bankHints]}
                </p>
              )}
              {errors.accountNumber && <p className="mt-1 text-xs text-error-500">{errors.accountNumber}</p>}
            </div>

            {/* Account Name */}
            <div>
              <Label>{tr.fieldAccountName} <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                disabled={!bankSelected}
                placeholder={tr.fieldAccountNamePlaceholder}
                value={form.accountName}
                onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
              />
              {errors.accountName && <p className="mt-1 text-xs text-error-500">{errors.accountName}</p>}
            </div>

            {/* Description */}
            <div>
              <Label>{tr.fieldDescription} <span className="text-gray-400 font-normal">{tr.fieldDescriptionOptional}</span></Label>
              <Input
                type="text"
                disabled={!bankSelected}
                placeholder={tr.fieldDescriptionPlaceholder}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Actions */}
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
                {loading && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
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
