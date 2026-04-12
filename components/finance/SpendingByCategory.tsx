import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SpendingCategory } from "@/lib/types/dashboard";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const COLORS = ["#465FFF", "#12B76A", "#F79009", "#F04438", "#7A5AF8", "#0BA5EC", "#EE46BC", "#16B364"];

interface Props {
  data?: SpendingCategory[];
  loading?: boolean;
}

export default function SpendingByCategory({ data = [], loading }: Props) {
  const [view, setView] = useState<"donut" | "bar">("donut");
  const [showTop, setShowTop] = useState(6);

  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const displayed = sorted.slice(0, showTop);
  const total = data.reduce((a, b) => a + b.amount, 0);

  const labels = displayed.map((d) => d.category);
  const series = displayed.map((d) => d.amount);

  const donutOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", height: 240 },
    colors: COLORS,
    labels,
    legend: { show: true, position: "bottom", fontFamily: "Outfit", fontSize: "12px" },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
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
    tooltip: { y: { formatter: (val) => fmt(val) } },
  };

  const barOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 240, toolbar: { show: false } },
    colors: COLORS,
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
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
    tooltip: { y: { formatter: (val) => fmt(val) } },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pengeluaran per Kategori</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.length} kategori · Total {fmt(total)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Top N filter */}
          <select
            value={showTop}
            onChange={(e) => setShowTop(parseInt(e.target.value))}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:outline-none"
          >
            <option value={5}>Top 5</option>
            <option value={6}>Top 6</option>
            <option value={8}>Top 8</option>
            <option value={999}>Semua</option>
          </select>
          {/* View toggle */}
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

      {loading ? (
        <div className="h-[240px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : series.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Belum ada data pengeluaran
        </div>
      ) : (
        <>
          <Chart
            key={view}
            options={view === "donut" ? donutOptions : barOptions}
            series={view === "donut" ? series : [{ name: "Pengeluaran", data: series }]}
            type={view === "donut" ? "donut" : "bar"}
            height={240}
          />
          {/* Detail list */}
          <div className="mt-3 space-y-1.5">
            {displayed.map((d, i) => (
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
