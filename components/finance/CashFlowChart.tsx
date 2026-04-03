import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "@components/ui/dropdown/Dropdown";
import { DropdownItem } from "@components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@components/icons";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CashFlowChart() {
  const [isOpen, setIsOpen] = useState(false);

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
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    xaxis: {
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      labels: {
        formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt`,
      },
    },
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
    {
      name: "Pemasukan",
      data: [32_000_000, 28_500_000, 41_000_000, 38_000_000, 45_000_000, 42_000_000, 48_500_000, 39_000_000, 51_000_000, 47_000_000, 53_000_000, 48_500_000],
    },
    {
      name: "Pengeluaran",
      data: [21_000_000, 19_500_000, 27_000_000, 25_000_000, 30_000_000, 28_000_000, 31_200_000, 26_000_000, 34_000_000, 31_000_000, 36_000_000, 31_200_000],
    },
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
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px]">
          <Chart options={options} series={series} type="bar" height={220} />
        </div>
      </div>
    </div>
  );
}
