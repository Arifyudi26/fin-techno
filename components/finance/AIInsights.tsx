"use client";
import { useState } from "react";
import axiosGlobal from "@/services/AxiosGlobal";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

interface AnalysisContext {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  negativeMonths: number;
  maxExpenseMonth?: { label: string; debit: number };
  topCategories: { name: string; amount: number }[];
}

export default function AIInsights() {
  const [analysis, setAnalysis] = useState<string>("");
  const [context, setContext] = useState<AnalysisContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setExpanded(true);
    try {
      const res = await axiosGlobal.get("/ai/analyze");
      setAnalysis(res.data.analysis);
      setContext(res.data.context);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Gagal menganalisis. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Render markdown-like text (bold, bullet)
  const renderText = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold: **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((part, j) =>
        j % 2 === 1 ? (
          <strong key={j} className="font-semibold text-gray-900 dark:text-white">
            {part}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        )
      );

      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 list-disc text-gray-700 dark:text-gray-300">
            {rendered}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {rendered}
        </p>
      );
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Analisis AI
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Insight keuangan berbasis data 6 bulan terakhir
            </p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Menganalisis...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {analysis ? "Analisis Ulang" : "Analisis Sekarang"}
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {!expanded && !analysis && (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-500/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Klik &quot;Analisis Sekarang&quot; untuk mendapatkan insight keuangan
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            AI akan membaca data transaksi dan memberikan rekomendasi personal
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AI sedang membaca data keuangan kamu...
          </p>
        </div>
      )}

      {error && (
        <div className="mx-5 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && analysis && (
        <>
          {/* Quick stats */}
          {context && (
            <div className="grid grid-cols-2 gap-3 px-5 pt-4 sm:grid-cols-4">
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Pemasukan</p>
                <p className="mt-0.5 text-sm font-semibold text-green-600 dark:text-green-400">
                  {fmt(context.totalIncome)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Pengeluaran</p>
                <p className="mt-0.5 text-sm font-semibold text-red-600 dark:text-red-400">
                  {fmt(context.totalExpense)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">Net Flow</p>
                <p className={`mt-0.5 text-sm font-semibold ${context.netFlow >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {fmt(context.netFlow)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">Bulan Terboros</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-white truncate">
                  {context.maxExpenseMonth?.label ?? "-"}
                </p>
              </div>
            </div>
          )}

          {/* Analysis text */}
          <div className="px-5 py-4 space-y-1">
            {renderText(analysis)}
          </div>
        </>
      )}
    </div>
  );
}
