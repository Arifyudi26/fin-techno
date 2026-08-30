import { useState, useEffect, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import { useI18n } from "@lib/i18n";
import { fmtIDR } from "@lib/formatters";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  transactionCount: number;
}

interface Suggestion {
  code: string;
  name: string;
  matchCount: number;
  totalAmount: number;
}

const codeColors: Record<string, string> = {
  GAJ: "bg-success-500", UTL: "bg-error-500", PAJ: "bg-warning-500",
  INV: "bg-purple-500", OPS: "bg-brand-500", LNY: "bg-gray-400",
  // recommendation template codes
  MKN: "bg-orange-500", TRP: "bg-blue-500", BBM: "bg-amber-600",
  BLJ: "bg-pink-500", TAG: "bg-error-500", PLS: "bg-cyan-500",
  HBR: "bg-purple-500", KSH: "bg-teal-500", TRF: "bg-indigo-500",
  ADM: "bg-slate-500", PDK: "bg-emerald-500",
};

function getColor(code: string) {
  return codeColors[code] ?? "bg-gray-500";
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [totalUncategorized, setTotalUncategorized] = useState(0);
  const [recLoading, setRecLoading] = useState(true);
  const [addingCode, setAddingCode] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  // Kode kategori yang baru ditambahkan & masih menunggu jumlah transaksi
  // final dari server — dipakai untuk menampilkan status "menghitung..."
  // alih-alih menampilkan angka 0 yang menyesatkan.
  const [processingCodes, setProcessingCodes] = useState<Set<string>>(new Set());
  const { toastState, fire, confirm, close } = useToast();
  const { t } = useI18n();
  const tr = t.categories;

  const fetchCategories = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // `_ts` = cache-buster. GET /categories mengirim header Cache-Control
      // (max-age + stale-while-revalidate), sehingga setelah mutate (tambah/
      // hapus) browser bisa menyajikan respons lama. Param unik memaksa fetch
      // segar agar state langsung sinkron tanpa perlu refresh manual.
      const res = await axiosGlobal.get("/categories", { params: { _ts: Date.now() } });
      setCategories(res.data.categories);
    } catch {
      fire("error", tr.errorLoad);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fire, tr]);

  const fetchRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const res = await axiosGlobal.get("/categories/recommendations", { params: { _ts: Date.now() } });
      setSuggestions(res.data.suggestions ?? []);
      setTotalUncategorized(res.data.totalUncategorized ?? 0);
    } catch {
      // rekomendasi bersifat opsional; jangan ganggu user dengan error keras
      setSuggestions([]);
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); fetchRecommendations(); }, [fetchCategories, fetchRecommendations]);

  const markProcessing = (codes: string[]) =>
    setProcessingCodes((prev) => new Set([...prev, ...codes]));
  const clearProcessing = (codes: string[]) =>
    setProcessingCodes((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => next.delete(c));
      return next;
    });

  const addSuggestion = async (s: Suggestion) => {
    setAddingCode(s.code);
    markProcessing([s.code]);
    try {
      await axiosGlobal.post("/categories", { name: s.name, code: s.code });
      setSuggestions((prev) => prev.filter((x) => x.code !== s.code));
      fire("success", tr.recAdded, { duration: 2500 });
      await fetchCategories(true);
    } catch {
      fire("error", tr.recError);
    } finally {
      setAddingCode(null);
      clearProcessing([s.code]);
    }
  };

  const addAllSuggestions = async () => {
    if (suggestions.length === 0) return;
    setAddingAll(true);
    const codes = suggestions.map((s) => s.code);
    markProcessing(codes);
    let added = 0;
    for (const s of suggestions) {
      try {
        await axiosGlobal.post("/categories", { name: s.name, code: s.code });
        added += 1;
      } catch {
        // lewati yang gagal (mis. sudah ada), lanjut sisanya
      }
    }
    setSuggestions([]);
    setAddingAll(false);
    fire("success", tr.recAddedAll.replace("{count}", String(added)), { duration: 2500 });
    await fetchCategories(true);
    clearProcessing(codes);
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description ?? "");
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    try {
      await axiosGlobal.put(`/categories/${editId}`, { name: editName, description: editDesc });
      fire("success", tr.updated, { duration: 2000 });
      setEditId(null);
      fetchCategories();
    } catch {
      fire("error", tr.errorUpdate);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const msg = cat.transactionCount > 0
      ? `"${cat.name}" ${tr.deleteWithTx.replace("{count}", String(cat.transactionCount))}`
      : `"${cat.name}" ${tr.deleteNoTx}`;
    const ok = await confirm("error", tr.confirmDelete, { message: msg, confirmText: t.common.delete, cancelText: t.common.cancel });
    if (!ok) return;
    // Optimistic: hapus kartu dari state langsung agar UI responsif dan tidak
    // menunggu refetch. Kalau request gagal, kembalikan daftar dari server.
    const prev = categories;
    setCategories((list) => list.filter((c) => c.id !== cat.id));
    try {
      await axiosGlobal.delete(`/categories/${cat.id}`);
      fire("success", tr.deleted, { duration: 2000 });
      // Transaksi kategori ini kembali "belum terkategorikan", jadi rekomendasi
      // perlu di-refresh agar usulan kategori tersebut muncul lagi.
      await Promise.all([fetchCategories(true), fetchRecommendations()]);
    } catch {
      setCategories(prev); // rollback bila gagal
      fire("error", tr.errorDelete);
    }
  };

  return (
    <AppLayout>
      <PageMeta title={`${tr.pageTitle} | Fin-Techno`} description={tr.description} />
      <PageBreadcrumb pageTitle={tr.pageTitle} />

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? "..." : `${categories.length} ${t.common.category.toLowerCase()}`}</p>
        <div className="flex items-center gap-2">
          <Link
            href="/categories/add"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {tr.addCategory}
          </Link>
        </div>
      </div>

      {/* Rekomendasi kategori dari transaksi yang belum terkategorikan */}
      {(recLoading || suggestions.length > 0) && (
        <div className="mb-6 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/[0.06] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white/90">{tr.recTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {recLoading
                    ? tr.recAnalyzing
                    : totalUncategorized > 0
                      ? tr.recUncategorized.replace("{count}", String(totalUncategorized))
                      : tr.recSubtitle}
                </p>
              </div>
            </div>
            {!recLoading && suggestions.length > 1 && (
              <button
                onClick={addAllSuggestions}
                disabled={addingAll}
                className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {addingAll ? "..." : tr.recAddAll}
              </button>
            )}
          </div>

          {recLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/60 dark:bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {suggestions.map((s) => (
                <div key={s.code} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getColor(s.code)}`}>
                      <span className="text-xs font-bold text-white">{s.code}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800 dark:text-white/90">{s.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {s.matchCount} {tr.recMatchCount} &middot; {fmtIDR(s.totalAmount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addSuggestion(s)}
                    disabled={addingCode === s.code || addingAll}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-500 px-3 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-500 hover:text-white disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    {addingCode === s.code ? "..." : tr.recAddOne}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              {editId === cat.id ? (
                <div className="space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder={tr.namePlaceholder}
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder={tr.descPlaceholder}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditId(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{t.common.cancel}</button>
                    <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs text-white hover:bg-brand-600 disabled:opacity-50">{t.common.save}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${getColor(cat.code)} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-sm font-bold">{cat.code}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white/90">{cat.name}</p>
                      {processingCodes.has(cat.code) ? (
                        <p className="flex items-center gap-1.5 text-sm text-brand-500">
                          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" /><path d="M12 2a10 10 0 019.54 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                          {tr.countingTx}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{cat.transactionCount} {tr.transactionCount}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(cat)} className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => handleDelete(cat)} className="p-2 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
