import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { CashFlowMonth, NetFlowPoint } from "@/lib/types/dashboard";
import { multiSeriestooltip } from "@/lib/apexTooltip";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

interface Props {
  data?: CashFlowMonth[];
  netFlowTrend?: NetFlowPoint[];
  loading?: boolean;
  periodLabel?: string;
}

const CHART_HEIGHT = 280;

export default function FinanceTrendChart({ data = [], netFlowTrend = [], loading, periodLabel }: Props) {
  const categories = netFlowTrend.length > 0
    ? netFlowTrend.map((d) => d.month)
    : data.map((d) => d.month);

  const creditData  = data.map((d) => d.credit);
  const debitNeg    = data.map((d) => -d.debit);
  const netFlowData = netFlowTrend.map((d) => d.netFlow);
  const balanceData = netFlowTrend.map((d) => d.balance ?? 0);
  const txCountData = netFlowTrend.map((d) => d.txCount ?? 0);

  const totalCredit = creditData.reduce((a, b) => a + b, 0);
  const totalDebit  = data.reduce((a, b) => a + b.debit, 0);
  const totalNet    = totalCredit - totalDebit;
  const lastBalance = balanceData[balanceData.length - 1] ?? 0;
  const totalTx     = txCountData.reduce((a, b) => a + b, 0);

  // Shared y-axis range untuk bar chart (simetris agar 0 di tengah)
  const maxVal = Math.max(...creditData, ...data.map((d) => d.debit), 1);
  const yBarMax = maxVal * 1.15;

  const commonXAxis: ApexOptions["xaxis"] = {
    categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" } },
  };

  // ── Chart 1: Bar (pemasukan atas, pengeluaran bawah) ──────────────────────
  const barOptions: ApexOptions = {
    chart: {
      id: "bar-chart",
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      stacked: true,
      animations: { enabled: true },
    },
    colors: ["#12B76A", "#F04438"],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        columnWidth: "50%",
        borderRadius: 6,
        borderRadiusApplication: "end",  // ujung terluar tiap bar
      },
    },
    legend: { show: false },
    xaxis: commonXAxis,
    yaxis: {
      min: -yBarMax,
      max: yBarMax,
      labels: {
        formatter: (val) => `${(Math.abs(val) / 1_000_000).toFixed(0)}jt`,
        style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" },
      },
    },
    annotations: {
      yaxis: [{ y: 0, borderColor: "#9CA3AF", borderWidth: 1 }],
    },
    grid: { yaxis: { lines: { show: true } }, padding: { right: 50 } },
    tooltip: {
      shared: true,
      intersect: false,
      style: { fontFamily: "Outfit, sans-serif" },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number }) => {
        const vals = [
          [series[0][dataPointIndex] ?? 0],
          [Math.abs(series[1][dataPointIndex] ?? 0)],
        ];
        return multiSeriestooltip(vals, 0, ["Pemasukan", "Pengeluaran"], ["#12B76A", "#F04438"], [true, true], 180);
      },
    },
  };

  const barSeries = [
    { name: "Pemasukan",   data: creditData },
    { name: "Pengeluaran", data: debitNeg },
  ];

  // ── Chart 2: Line (net flow, saldo, transaksi) — overlay ─────────────────
  const lineOptions: ApexOptions = {
    chart: {
      id: "line-chart",
      type: "line",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: true },
    },
    colors: ["#465FFF", "#F79009", "#7C3AED"],
    dataLabels: { enabled: false },
    stroke: { width: [2, 2, 2], curve: "smooth" },
    legend: { show: false },
    xaxis: {
      ...commonXAxis,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        seriesName: "Net Flow",
        show: false,
      },
      { seriesName: "Net Flow", show: false },
      {
        opposite: true,
        seriesName: "Transaksi",
        labels: {
          formatter: (val) => `${Math.round(val)}`,
          style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" },
        },
      },
    ],
    grid: { show: false },
    markers: { size: 3, strokeColors: "#fff", strokeWidth: 2, hover: { size: 5 } },
    fill: { type: "solid", opacity: 1 },
    tooltip: {
      shared: true,
      intersect: false,
      style: { fontFamily: "Outfit, sans-serif" },
      custom: ({ series, dataPointIndex }: { series: number[][]; dataPointIndex: number }) => {
        const vals = series.map((s) => [s[dataPointIndex] ?? 0]);
        return multiSeriestooltip(vals, 0, ["Net Flow", "Saldo", "Transaksi"], ["#465FFF", "#F79009", "#7C3AED"], [true, true, false], 180);
      },
    },
  };

  const lineSeries = [
    { name: "Net Flow",  data: netFlowData },
    { name: "Saldo",     data: balanceData },
    { name: "Transaksi", data: txCountData },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Tren Keuangan</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel ?? "Ringkasan keuangan"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-3">
        {[
          { color: "#12B76A", label: "Masuk", value: fmt(totalCredit), cls: "" },
          { color: "#F04438", label: "Keluar", value: fmt(totalDebit), cls: "" },
          { color: "#465FFF", label: "Net Flow", value: fmt(totalNet), cls: totalNet >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400" },
          { color: "#F79009", label: "Saldo", value: fmt(lastBalance), cls: lastBalance >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400" },
          { color: "#7C3AED", label: "Transaksi", value: `${totalTx}x`, cls: "" },
        ].map(({ color, label, value, cls }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label}: <span className={`font-semibold ${cls || "text-gray-700 dark:text-gray-200"}`}>{value}</span>
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-[280px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : (
        <div className="max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="min-w-[500px] relative">
            {/* Bar chart — base layer */}
            <Chart options={barOptions} series={barSeries} type="bar" height={CHART_HEIGHT} />
            {/* Line chart — overlay, pointer-events none agar tooltip bar tetap jalan */}
            <div className="absolute inset-0 pointer-events-none">
              <Chart options={lineOptions} series={lineSeries} type="line" height={CHART_HEIGHT} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
