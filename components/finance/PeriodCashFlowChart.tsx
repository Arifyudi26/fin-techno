import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { multiSeriestooltip } from "@/lib/apexTooltip";

interface DailyPoint { date: string; credit: number; debit: number; }

interface Props { data: DailyPoint[]; }

export default function PeriodCashFlowChart({ data }: Props) {
  const options: ApexOptions = {
    colors: ["#22c55e", "#ef4444"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 240, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "70%", borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    legend: { show: true, position: "top", horizontalAlign: "left", fontFamily: "Outfit" },
    grid: { yaxis: { lines: { show: true } } },
    xaxis: {
      categories: data.map((d) => d.date),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#9ca3af", fontSize: "10px" }, rotate: -45 },
    },
    yaxis: {
      labels: {
        formatter: (v) => `${(v / 1_000_000).toFixed(1)}jt`,
        style: { fontSize: "11px", colors: ["#6B7280"] },
      },
    },
    tooltip: {
      shared: true, intersect: false, style: { fontFamily: "Outfit, sans-serif" },
      marker: { show: false },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number; w: Record<string, unknown> }) =>
        multiSeriestooltip(series, dataPointIndex, ["Pemasukan", "Pengeluaran"], ["#22c55e", "#ef4444"], 220),
    },
  };

  return (
    <Chart
      type="bar"
      height={240}
      series={[
        { name: "Pemasukan", data: data.map((d) => d.credit) },
        { name: "Pengeluaran", data: data.map((d) => d.debit) },
      ]}
      options={options}
    />
  );
}
