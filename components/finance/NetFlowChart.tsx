import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { NetFlowPoint } from "@/lib/types/dashboard";
import { multiSeriestooltip } from "@/lib/apexTooltip";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

interface Props {
  data?: NetFlowPoint[];
  loading?: boolean;
}

export default function NetFlowChart({ data = [], loading }: Props) {
  const [showAvg, setShowAvg] = useState(true);

  const categories = data.map((d) => d.month);
  const netFlowData = data.map((d) => d.netFlow);

  const avg = netFlowData.length > 0 ? netFlowData.reduce((a, b) => a + b, 0) / netFlowData.length : 0;
  const avgData = netFlowData.map(() => Math.round(avg));

  const positiveMonths = netFlowData.filter((v) => v > 0).length;
  const negativeMonths = netFlowData.filter((v) => v < 0).length;
  const bestMonth = data.reduce((best, d) => d.netFlow > (best?.netFlow ?? -Infinity) ? d : best, data[0]);
  const worstMonth = data.reduce((worst, d) => d.netFlow < (worst?.netFlow ?? Infinity) ? d : worst, data[0]);

  const options: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF", "#9CB9FF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 220, type: "area", toolbar: { show: false } },
    stroke: { curve: "smooth", width: [2, 2] },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 5 } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: {
      shared: true, intersect: false, style: { fontFamily: "Outfit, sans-serif" },
      marker: { show: false },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number; w: Record<string, unknown> }) =>
        multiSeriestooltip(series, dataPointIndex, ["Net Flow", "Rata-rata"], ["#465FFF", "#9CB9FF"]),
    },
    xaxis: { type: "category", categories, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: {
        formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt`,
        style: { fontSize: "12px", colors: ["#6B7280"] },
      },
    },
    annotations: {
      yaxis: [
        {
          y: 0,
          borderColor: "#6B7280",
          borderWidth: 1,
          strokeDashArray: 4,
        },
      ],
    },
  };

  const series = [
    { name: "Net Flow", data: netFlowData },
    ...(showAvg ? [{ name: "Rata-rata", data: avgData }] : []),
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Tren Net Flow</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Selisih pemasukan & pengeluaran</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAvg(!showAvg)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              showAvg
                ? "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900"
            }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-200" />
            Rata-rata
          </button>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-500" />Net Flow
          </span>
        </div>
      </div>

      {/* Stats row */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Rata-rata</p>
            <p className={`text-xs font-semibold ${avg >= 0 ? "text-success-600" : "text-error-600"}`}>{fmt(avg)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Positif / Negatif</p>
            <p className="text-xs font-semibold">
              <span className="text-success-600">{positiveMonths}</span>
              <span className="text-gray-400 dark:text-gray-500"> / </span>
              <span className="text-error-600">{negativeMonths}</span>
            </p>
          </div>
          {bestMonth && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Terbaik</p>
              <p className="text-xs font-semibold text-success-600 truncate">{bestMonth.month}</p>
            </div>
          )}
          {worstMonth && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Terburuk</p>
              <p className="text-xs font-semibold text-error-600 truncate">{worstMonth.month}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-[220px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[500px]">
            <Chart options={options} series={series} type="area" height={220} />
          </div>
        </div>
      )}
    </div>
  );
}
