import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { donutTooltip } from "@/lib/apexTooltip";

const COLORS = ["#465FFF","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#14b8a6","#6366f1"];

interface Props { labels: string[]; series: number[]; }

export default function PeriodDonutChart({ labels, series }: Props) {
  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", height: 260 },
    colors: COLORS,
    labels,
    legend: { show: true, position: "bottom", fontFamily: "Outfit", fontSize: "11px" },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: {
      style: { fontFamily: "Outfit, sans-serif" },
      marker: { show: false },
      custom: ({ series: s, seriesIndex, w }: { series: number[]; seriesIndex: number; w: { globals: { labels: string[]; colors: string[] } } }) =>
        donutTooltip(s[seriesIndex] ?? 0, s.reduce((a, b) => a + b, 0), w.globals.labels[seriesIndex] ?? "", w.globals.colors[seriesIndex] ?? COLORS[0]),
    },
  };

  return <Chart type="donut" height={260} series={series} options={options} />;
}
