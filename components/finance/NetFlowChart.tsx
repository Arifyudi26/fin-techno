import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { NetFlowPoint } from "@/lib/types/dashboard";

interface Props {
  data?: NetFlowPoint[];
  loading?: boolean;
}

export default function NetFlowChart({ data = [], loading }: Props) {
  const categories = data.map((d) => d.month);
  const netFlowData = data.map((d) => d.netFlow);

  // Hitung rata-rata rolling
  const avg = netFlowData.length > 0 ? netFlowData.reduce((a, b) => a + b, 0) / netFlowData.length : 0;
  const avgData = netFlowData.map(() => Math.round(avg));

  const options: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF", "#9CB9FF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 250, type: "area", toolbar: { show: false } },
    stroke: { curve: "smooth", width: [2, 2] },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 5 } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: {
      shared: true,
      intersect: false,
      style: { fontFamily: "Outfit, sans-serif" },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number; w: { globals: { categoryLabels: string[] } } }) => {
        const seriesNames = ["Net Flow", "Rata-rata"];
        const colors = ["#465FFF", "#9CB9FF"];
        const rows = series.map((s, i) =>
          `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px${i > 0 ? ";margin-top:6px" : ""}">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${colors[i]};flex-shrink:0"></span>
              <span style="color:#9ca3af;font-size:12px">${seriesNames[i]}</span>
            </div>
            <span style="color:${colors[i]};font-size:12px;font-weight:600">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(s[dataPointIndex] ?? 0)}</span>
          </div>`
        ).join("");
        return `<div class="apexcharts-custom-tooltip" style="background:#1f2937;border:1px solid #374151;border-radius:10px;padding:10px 14px;min-width:180px;font-family:Outfit,sans-serif">${rows}</div>`;
      },
    },
    xaxis: { type: "category", categories, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: {
        formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt`,
        style: { fontSize: "12px", colors: ["#6B7280"] },
      },
    },
  };

  const series = [
    { name: "Net Flow", data: netFlowData },
    { name: "Rata-rata", data: avgData },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Tren Net Flow</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Selisih pemasukan & pengeluaran</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-brand-500" />Net Flow</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-brand-200" />Rata-rata</span>
        </div>
      </div>
      {loading ? (
        <div className="h-[250px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[500px]">
            <Chart options={options} series={series} type="area" height={250} />
          </div>
        </div>
      )}
    </div>
  );
}
