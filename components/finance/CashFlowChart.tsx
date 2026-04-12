import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { CashFlowMonth } from "@/lib/types/dashboard";
import { multiSeriestooltip } from "@/lib/apexTooltip";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

interface Props {
  data?: CashFlowMonth[];
  loading?: boolean;
  months?: number;
  onMonthsChange?: (m: number) => void;
}

const MONTH_OPTIONS = [3, 6, 12];

export default function CashFlowChart({ data = [], loading, months = 12, onMonthsChange }: Props) {
  const [view, setView] = useState<"bar" | "line">("bar");

  // Slice data sesuai pilihan bulan
  const sliced = data.slice(-months);
  const categories = sliced.map((d) => d.month);
  const creditData = sliced.map((d) => d.credit);
  const debitData = sliced.map((d) => d.debit);

  const totalCredit = creditData.reduce((a, b) => a + b, 0);
  const totalDebit = debitData.reduce((a, b) => a + b, 0);

  const commonOptions: ApexOptions = {
    colors: ["#12B76A", "#F04438"],
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
    dataLabels: { enabled: false },
    xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
    legend: { show: true, position: "top", horizontalAlign: "left", fontFamily: "Outfit" },
    yaxis: { labels: { formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt` } },
    grid: { yaxis: { lines: { show: true } } },
    tooltip: {
      shared: true, intersect: false, style: { fontFamily: "Outfit, sans-serif" },
      marker: { show: false },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number; w: Record<string, unknown> }) =>
        multiSeriestooltip(series, dataPointIndex, ["Pemasukan", "Pengeluaran"], ["#12B76A", "#F04438"]),
    },
  };

  const barOptions: ApexOptions = {
    ...commonOptions,
    chart: { ...commonOptions.chart, type: "bar", height: 220 },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end" } },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    fill: { opacity: 1 },
  };

  const lineOptions: ApexOptions = {
    ...commonOptions,
    chart: { ...commonOptions.chart, type: "line", height: 220 },
    stroke: { curve: "smooth", width: 2 },
    markers: { size: 3, strokeColors: "#fff", strokeWidth: 2 },
    fill: { opacity: 1 },
  };

  const series = [
    { name: "Pemasukan", data: creditData },
    { name: "Pengeluaran", data: debitData },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cash Flow Bulanan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pemasukan vs Pengeluaran per bulan</p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          {/* Toggle view */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tampilan</label>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(["bar", "line"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v
                      ? "bg-brand-500 text-white"
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {v === "bar" ? "Batang" : "Garis"}
                </button>
              ))}
            </div>
          </div>
          {/* Months filter */}
          {onMonthsChange && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Periode</label>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {MONTH_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => onMonthsChange(m)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      months === m
                        ? "bg-brand-500 text-white"
                        : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {m}B
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-success-500 inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Masuk: <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(totalCredit)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-error-500 inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Keluar: <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(totalDebit)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${totalCredit - totalDebit >= 0 ? "text-success-600" : "text-error-600"}`}>
            Net: {fmt(totalCredit - totalDebit)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[500px]">
            <Chart
              key={view}
              options={view === "bar" ? barOptions : lineOptions}
              series={series}
              type={view}
              height={220}
            />
          </div>
        </div>
      )}
    </div>
  );
}
