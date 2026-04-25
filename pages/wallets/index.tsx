import { useState, useEffect, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import WalletProviderIcon from "@components/icons/providers/WalletIcon";
import { useI18n } from "@lib/i18n";

const walletProviders = ["GOPAY", "OVO", "DANA", "SHOPEEPAY", "LINKAJA", "SAKUKU", "JENIUS", "OTHER"];

interface DigitalWallet {
  id: string;
  walletProvider: string;
  phoneNumber: string;
  accountName: string;
  isActive: boolean;
  totalUploads: number;
  totalTransactions: number;
  totalCredit: number;
  totalDebit: number;
  lastUploadDate: string | null;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<DigitalWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ walletProvider: "", phoneNumber: "", accountName: "" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toastState, fire, confirm, close } = useToast();
  const { t } = useI18n();
  const tr = t.wallets;

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosGlobal.get("/wallets");
      setWallets(res.data.wallets);
    } catch {
      fire("error", tr.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [fire, tr]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.walletProvider) e.walletProvider = tr.errorProvider;
    if (!form.phoneNumber) e.phoneNumber = tr.errorPhone;
    if (!form.accountName) e.accountName = tr.errorAccountName;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await axiosGlobal.post("/wallets", form);
      fire("success", tr.added, { duration: 2000 });
      setShowForm(false);
      setForm({ walletProvider: "", phoneNumber: "", accountName: "" });
      fetchWallets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? tr.errorSave;
      fire("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (w: DigitalWallet) => {
    const ok = await confirm("warning", w.isActive ? tr.confirmDeactivate : tr.confirmActivate, {
      message: `${w.walletProvider} · ${w.phoneNumber}`,
      confirmText: w.isActive ? tr.confirmDeactivate.replace("?", "") : tr.confirmActivate.replace("?", ""),
      cancelText: t.common.cancel,
    });
    if (!ok) return;
    try {
      await axiosGlobal.put(`/wallets/${w.id}`, { isActive: !w.isActive });
      fire("success", w.isActive ? tr.deactivated : tr.activated, { duration: 2000 });
      fetchWallets();
    } catch {
      fire("error", tr.errorToggle);
    }
  };

  const handleDelete = async (w: DigitalWallet) => {
    const hasHistory = w.totalTransactions > 0 || w.totalUploads > 0;
    const ok = await confirm("error", tr.confirmDelete, {
      message: hasHistory
        ? `${w.walletProvider} · ${w.phoneNumber} ${tr.deleteWithHistory.replace("{tx}", String(w.totalTransactions))}`
        : `${w.walletProvider} · ${w.phoneNumber} ${tr.deleteNoHistory}`,
      confirmText: t.common.delete,
      cancelText: t.common.cancel,
    });
    if (!ok) return;
    try {
      await axiosGlobal.delete(`/wallets/${w.id}`);
      fire("success", tr.deleted, { duration: 2000 });
      fetchWallets();
    } catch {
      fire("error", tr.errorDelete);
    }
  };

  return (
    <AppLayout>
      <PageMeta title={`${tr.pageTitle} | Fin-Techno`} description={tr.description} />
      <PageBreadcrumb pageTitle={tr.pageTitle} />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? "..." : `${wallets.filter(w => w.isActive).length} ${tr.activeCount}`}</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          {tr.addWallet}
        </button>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tr.addWalletTitle}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{tr.providerLabel} <span className="text-error-500">*</span></label>
                <select
                  value={form.walletProvider}
                  onChange={(e) => setForm((p) => ({ ...p, walletProvider: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">{tr.selectProvider}</option>
                  {walletProviders.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.walletProvider && <p className="mt-1 text-xs text-error-500">{errors.walletProvider}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{tr.phoneLabel} <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder={tr.phonePlaceholder}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                {errors.phoneNumber && <p className="mt-1 text-xs text-error-500">{errors.phoneNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{tr.accountNameLabel} <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
                  placeholder={tr.accountNamePlaceholder}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                {errors.accountName && <p className="mt-1 text-xs text-error-500">{errors.accountName}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">{t.common.cancel}</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">{tr.noWallets}</p>
          <p className="text-sm text-gray-400 mb-5">{tr.noWalletsDesc}</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {tr.addWallet}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {wallets.map((w) => (
            <div key={w.id} className={`rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden transition-opacity ${w.isActive ? "border-gray-200 dark:border-gray-800" : "border-gray-100 dark:border-gray-800/50 opacity-60"}`}>
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WalletProviderIcon provider={w.walletProvider} size={40} />
                  <div>
                    <p className="font-semibold text-white">{w.accountName}</p>
                    <p className="text-xs text-white/70">{w.phoneNumber}</p>
                  </div>
                </div>
                <Badge size="sm" color={w.isActive ? "success" : "light"}>{w.isActive ? "Aktif" : "Nonaktif"}</Badge>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Upload</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{w.totalUploads}x</p>
                  </div>
                  <div className="text-center border-x border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-success-600 dark:text-success-400 mb-0.5">Masuk</p>
                    <p className="text-sm font-semibold text-success-600 dark:text-success-400">{(w.totalCredit / 1_000_000).toFixed(0)}jt</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-error-600 dark:text-error-400 mb-0.5">Keluar</p>
                    <p className="text-sm font-semibold text-error-600 dark:text-error-400">{(w.totalDebit / 1_000_000).toFixed(0)}jt</p>
                  </div>
                </div>
                {w.lastUploadDate && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{tr.lastUpload}: {new Date(w.lastUploadDate).toLocaleDateString("id-ID")}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(w)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                  >
                    {w.isActive ? tr.confirmDeactivate.replace("?", "") : tr.confirmActivate.replace("?", "")}
                  </button>
                  {w.isActive ? (
                    <a
                      href={`/upload?wallet=${w.id}`}
                      className="flex-1 text-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                    >
                      {t.upload.uploadBtn}
                    </a>
                  ) : (
                    <span
                      title={tr.uploadDisabledTitle}
                      className="flex-1 text-center rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    >
                      {t.upload.uploadBtn}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(w)}
                    title="Hapus dompet"
                    className="inline-flex items-center justify-center rounded-lg border border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 px-2.5 py-2 text-error-500 hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
