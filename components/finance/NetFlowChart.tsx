import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function NetFlowChart() {
  const options: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 250,
      type: "area",
      toolbar: { show: false },
    },
    stroke: { curve: "smooth", width: [2, 2] },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0 },
    },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 5 } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val),
      },
    },
    xaxis: {
      type: "category",
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt`,
        style: { fontSize: "12px", colors: ["#6B7280"] },
      },
    },
  };

  const series = [
    {
      name: "Net Flow",
      data: [11_000_000, 9_000_000, 14_000_000, 13_000_000, 15_000_000, 14_000_000, 17_300_000, 13_000_000, 17_000_000, 16_000_000, 17_000_000, 17_300_000],
    },
    {
      name: "Rata-rata",
      data: [12_000_000, 12_000_000, 13_000_000, 13_000_000, 14_000_000, 14_000_000, 14_500_000, 14_500_000, 15_000_000, 15_000_000, 15_500_000, 15_500_000],
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Tren Net Flow</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Selisih pemasukan & pengeluaran</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-brand-500"></span>Net Flow</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-brand-200"></span>Rata-rata</span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[500px]">
          <Chart options={options} series={series} type="area" height={250} />
        </div>
      </div>
    </div>
  );
}
