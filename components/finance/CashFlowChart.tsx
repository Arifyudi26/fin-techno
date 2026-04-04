import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "@components/ui/dropdown/Dropdown";
import { DropdownItem } from "@components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@components/icons";
import { CashFlowMonth } from "@/lib/types/dashboard";

interface Props {
  data?: CashFlowMonth[];
  loading?: boolean;
}

export default function CashFlowChart({ data = [], loading }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const categories = data.map((d) => d.month);
  const creditData = data.map((d) => d.credit);
  const debitData = data.map((d) => d.debit);

  const options: ApexOptions = {
    colors: ["#12B76A", "#F04438"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 220,
      toolbar: { show: false },
      stacked: false,
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
    legend: { show: true, position: "top", horizontalAlign: "left", fontFamily: "Outfit" },
    yaxis: { labels: { formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt` } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val),
      },
    },
  };

  const series = [
    { name: "Pemasukan", data: creditData },
    { name: "Pengeluaran", data: debitData },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cash Flow Bulanan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pemasukan vs Pengeluaran per bulan</p>
        </div>
        <div className="relative">
          <button onClick={() => setIsOpen(!isOpen)}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
            <DropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
              Export CSV
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
      {loading ? (
        <div className="h-[220px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[600px]">
            <Chart options={options} series={series} type="bar" height={220} />
          </div>
        </div>
      )}
    </div>
  );
}
