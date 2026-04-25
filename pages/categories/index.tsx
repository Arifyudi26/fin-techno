import { useState, useEffect, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import { useI18n } from "@lib/i18n";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  transactionCount: number;
}

const codeColors: Record<string, string> = {
  GAJ: "bg-success-500", UTL: "bg-error-500", PAJ: "bg-warning-500",
  INV: "bg-purple-500", OPS: "bg-brand-500", LNY: "bg-gray-400",
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
  const { toastState, fire, confirm, close } = useToast();
  const { t } = useI18n();
  const tr = t.categories;

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosGlobal.get("/categories");
      setCategories(res.data.categories);
    } catch {
      fire("error", tr.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [fire, tr]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

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
    try {
      await axiosGlobal.delete(`/categories/${cat.id}`);
      fire("success", tr.deleted, { duration: 2000 });
      fetchCategories();
    } catch {
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">{cat.transactionCount} {tr.transactionCount}</p>
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
