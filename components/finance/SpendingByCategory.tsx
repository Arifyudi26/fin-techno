import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SpendingCategory } from "@/lib/types/dashboard";
import { donutTooltip, singleSeriesTooltip } from "@/lib/apexTooltip";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const COLORS = ["#465FFF", "#12B76A", "#F79009", "#F04438", "#7A5AF8", "#0BA5EC", "#EE46BC", "#16B364"];

interface Props {
  data?: SpendingCategory[];
  incomeData?: SpendingCategory[];
  loading?: boolean;
}

export default function SpendingByCategory({ data = [], incomeData = [], loading }: Props) {
  const [view, setView] = useState<"donut" | "bar">("donut");
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const activeData = tab === "expense" ? data : incomeData;
  const sorted = [...activeData].sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((a, b) => a + b.amount, 0);
  const labels = sorted.map((d) => d.category);
  const series = sorted.map((d) => d.amount);

  const donutOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", height: 240 },
    colors: COLORS,
    labels,
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            value: {
              show: true,
              fontSize: "13px",
              fontFamily: "Outfit",
              color: "#374151",
              formatter: (val: string) => fmt(Number(val)),
            },
            total: {
              show: true,
              label: "Total",
              fontSize: "12px",
              fontFamily: "Outfit",
              color: "#667085",
              formatter: () => fmt(total),
            },
          },
        },
      },
    },
    tooltip: {
      custom: ({ series, seriesIndex, w }: { series: number[]; seriesIndex: number; w: { globals: { labels: string[]; colors: string[] } } }) =>
        donutTooltip(series[seriesIndex] ?? 0, series.reduce((a, b) => a + b, 0), w.globals.labels[seriesIndex] ?? "", w.globals.colors[seriesIndex] ?? COLORS[0]),
      marker: { show: false },
    },
  };

  const barOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 240, toolbar: { show: false } },
    colors: COLORS,
    plotOptions: { bar: { horizontal: true, borderRadius: 8, borderRadiusApplication: "around", distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: labels,
      labels: { formatter: (val) => `${(Number(val) / 1_000_000).toFixed(1)}jt` },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: {
      custom: ({ series, dataPointIndex, w }: { series: number[][]; dataPointIndex: number; w: { globals: { colors: string[] } } }) =>
        singleSeriesTooltip(series[0][dataPointIndex] ?? 0, labels[dataPointIndex] ?? "", w.globals.colors[dataPointIndex] ?? COLORS[0]),
      marker: { show: false },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {tab === "expense" ? "Pengeluaran" : "Pemasukan"} per Kategori
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sorted.length} kategori · Total {fmt(total)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab: Pengeluaran / Pemasukan */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipe</label>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setTab("expense")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === "expense"
                    ? "bg-error-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Pengeluaran
              </button>
              <button
                onClick={() => setTab("income")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === "income"
                    ? "bg-success-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>
          {/* View toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tampilan</label>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(["donut", "bar"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === v
                      ? "bg-brand-500 text-white"
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {v === "donut" ? "Donut" : "Bar"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : series.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Belum ada data {tab === "expense" ? "pengeluaran" : "pemasukan"}
        </div>
      ) : (
        <>
          <Chart
            key={`${view}-${tab}`}
            options={view === "donut" ? donutOptions : barOptions}
            series={view === "donut" ? series : [{ name: tab === "expense" ? "Pengeluaran" : "Pemasukan", data: series }]}
            type={view === "donut" ? "donut" : "bar"}
            height={280}
          />
          <div className="mt-3 space-y-1.5">
            {sorted.map((d, i) => (
              <div key={d.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{d.category}</span>
                  {d.count != null && (
                    <span className="text-gray-400 dark:text-gray-500">({d.count}x)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500">{total > 0 ? ((d.amount / total) * 100).toFixed(1) : 0}%</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(d.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
