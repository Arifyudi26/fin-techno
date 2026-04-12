import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import axiosGlobal from "@/services/AxiosGlobal";
import ReportFilters, { ReportFilterState } from "@components/finance/ReportFilters";
import { singleSeriesTooltip, donutTooltip } from "@/lib/apexTooltip";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const fmtPct = (v: number | null) =>
  v === null ? null : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const COLORS = ["#465FFF","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#14b8a6","#6366f1"];

interface MonthlyTrend { month: string; monthNum: number; total: number; count: number; }
interface ByCategory   { name: string; total: number; count: number; }
interface BySource     { provider: string; accountName: string; source: string; total: number; count: number; }
interface Summary {
  grandTotal: number; avgMonthly: number; totalTransactions: number;
  prevTotal: number; pctChange: number | null;
  bestPeriod: { label: string; total: number };
}

const DEFAULT_FILTERS: ReportFilterState = {
  year: new Date().getFullYear(),
  month: null,
  accountId: null,
  accountType: null,
};

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export default function IncomeReport() {
  const [filters, setFilters] = useState<ReportFilterState>(DEFAULT_FILTERS);
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [monthly, setMonthly]       = useState<MonthlyTrend[]>([]);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [bySource, setBySource]     = useState<BySource[]>([]);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async (f: ReportFilterState) => {
    setLoading(true);
    try {
      const p: Record<string, string> = { year: String(f.year) };
      if (f.month != null) p.month       = String(f.month);
      if (f.accountId)     p.accountId   = f.accountId;
      if (f.accountType)   p.accountType = f.accountType;
      const res = await axiosGlobal.get("/reports/income", { params: p });
      setSummary(res.data.summary);
      setMonthly(res.data.monthlyTrend);
      setByCategory(res.data.byCategory);
      setBySource(res.data.bySource);
    } catch { setSummary(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(DEFAULT_FILTERS); }, [fetchData]);

  const handleChange = (partial: Partial<ReportFilterState>) => {
    setFilters((prev) => { const next = { ...prev, ...partial }; fetchData(next); return next; });
  };
  const handleReset = () => { setFilters(DEFAULT_FILTERS); fetchData(DEFAULT_FILTERS); };

  const periodLabel = filters.month != null
    ? `${MONTH_SHORT[filters.month - 1]} ${filters.year}`
    : `Tahun ${filters.year}`;

  const barOptions = {
    chart: { toolbar: { show: false }, background: "transparent" },
    colors: ["#22c55e"],
    xaxis: { categories: monthly.map((m) => m.month), labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
    yaxis: { labels: { formatter: (v: number) => `${(v / 1_000_000).toFixed(0)}jt`, style: { colors: "#9ca3af", fontSize: "11px" } } },
    grid: { borderColor: "#374151", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    tooltip: {
      shared: true, intersect: false,
      marker: { show: false },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number; w: Record<string, unknown> }) =>
        singleSeriesTooltip(series[0][dataPointIndex] ?? 0, "Pemasukan", "#22c55e"),
    },
  };

  const donutOptions = {
    chart: { background: "transparent" },
    labels: byCategory.slice(0, 8).map((c) => c.name),
    colors: COLORS,
    legend: { position: "bottom" as const, fontSize: "12px" },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: {
      marker: { show: false },
      custom: ({ series, seriesIndex, w }: { series: number[]; seriesIndex: number; w: { globals: { labels: string[]; colors: string[] } } }) =>
        donutTooltip(series[seriesIndex] ?? 0, series.reduce((a, b) => a + b, 0), w.globals.labels[seriesIndex] ?? "", w.globals.colors[seriesIndex] ?? COLORS[0]),
    },
  };

  return (
    <AppLayout>
      <PageMeta title="Laporan Pemasukan | MyFinance" description="Analitik dan tren pemasukan" />
      <PageBreadcrumb pageTitle="Laporan Pemasukan" />

      <div className="flex items-center justify-end mb-4">
        <Link href="/transactions/income" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Lihat Detail Transaksi
        </Link>
      </div>

      <ReportFilters filters={filters} onChange={handleChange} onReset={handleReset} />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
          <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      ) : !summary ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">Belum ada data pemasukan untuk periode ini</p>
          <Link href="/upload" className="mt-3 text-sm text-brand-500 hover:underline">Upload e-Statement sekarang</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
              <p className="text-xs text-success-600 dark:text-success-400 mb-1">Total Pemasukan</p>
              <p className="text-xl font-bold text-success-700 dark:text-success-400">+{fmt(summary.grandTotal)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rata-rata / {filters.month != null ? "Minggu" : "Bulan"}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90">{fmt(summary.avgMonthly)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">vs Periode Lalu</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90">{fmt(summary.prevTotal)}</p>
              {summary.pctChange !== null && (
                <p className={`text-xs mt-0.5 ${summary.pctChange >= 0 ? "text-success-500" : "text-error-500"}`}>
                  {fmtPct(summary.pctChange)}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-brand-200 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 p-4">
              <p className="text-xs text-brand-600 dark:text-brand-400 mb-1">Periode Terbaik</p>
              <p className="text-base font-bold text-brand-700 dark:text-brand-400">{summary.bestPeriod.label}</p>
              <p className="text-xs text-brand-600 dark:text-brand-400">{fmt(summary.bestPeriod.total)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">
              Tren Pemasukan &mdash; {periodLabel}
            </h3>
            <Chart type="bar" height={260} series={[{ name: "Pemasukan", data: monthly.map((m) => m.total) }]} options={barOptions} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Pemasukan per Kategori</h3>
              {byCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Tidak ada data</p>
              ) : (
                <Chart type="donut" height={280} series={byCategory.slice(0, 8).map((c) => c.total)} options={donutOptions} />
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Pemasukan per Sumber</h3>
              {bySource.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Tidak ada data</p>
              ) : (
                <div className="space-y-3">
                  {bySource.map((s, i) => {
                    const p = summary.grandTotal > 0 ? (s.total / summary.grandTotal) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.source === "BANK" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"}`}>{s.source}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{s.provider} &middot; {s.accountName}</span>
                          </div>
                          <span className="text-sm font-semibold text-success-600 dark:text-success-400">+{fmt(s.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div className="h-full rounded-full bg-success-500" style={{ width: `${p}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{p.toFixed(1)}% &middot; {s.count} transaksi</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Rincian per Kategori</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {byCategory.map((cat, i) => {
                  const p = summary.grandTotal > 0 ? (cat.total / summary.grandTotal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                      <span className="text-xs text-gray-400 w-16 text-right">{cat.count}x</span>
                      <span className="text-xs text-gray-400 w-12 text-right">{p.toFixed(1)}%</span>
                      <span className="text-sm font-semibold text-success-600 dark:text-success-400 w-36 text-right">+{fmt(cat.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
