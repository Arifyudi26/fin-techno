import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { CashFlowMonth, NetFlowPoint } from "@/lib/types/dashboard";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

interface Props {
  data?: CashFlowMonth[];
  netFlowTrend?: NetFlowPoint[];
  loading?: boolean;
  periodLabel?: string;
}

export default function CashFlowChart({ data = [], netFlowTrend = [], loading, periodLabel }: Props) {
  const categories = netFlowTrend.length > 0
    ? netFlowTrend.map((d) => d.month)
    : data.map((d) => d.month);

  const creditData = data.map((d) => d.credit);
  const debitData  = data.map((d) => d.debit);
  const netFlowData  = netFlowTrend.map((d) => d.netFlow);
  const balanceData  = netFlowTrend.map((d) => d.balance ?? 0);
  const txCountData  = netFlowTrend.map((d) => d.txCount ?? 0);

  const totalCredit = creditData.reduce((a, b) => a + b, 0);
  const totalDebit  = debitData.reduce((a, b) => a + b, 0);
  const totalNet    = totalCredit - totalDebit;
  const lastBalance = balanceData[balanceData.length - 1] ?? 0;
  const totalTx     = txCountData.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    chart: {
      type: "line",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      stacked: false,
    },
    colors: ["#12B76A", "#F04438", "#465FFF", "#F79009", "#7C3AED"],
    dataLabels: { enabled: false },
    stroke: {
      // bar series pakai width 0, line series pakai width 2
      width: [0, 0, 2, 2, 2],
      curve: "smooth",
    },
    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    fill: { opacity: [1, 1, 1, 1, 1] },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
      fontSize: "12px",
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" } },
    },
    yaxis: [
      // Y-axis kiri: currency (Pemasukan, Pengeluaran, Net Flow, Saldo)
      {
        seriesName: "Pemasukan",
        labels: {
          formatter: (val) => `${(val / 1_000_000).toFixed(0)}jt`,
          style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" },
        },
      },
      { seriesName: "Pemasukan", show: false },
      { seriesName: "Pemasukan", show: false },
      { seriesName: "Pemasukan", show: false },
      // Y-axis kanan: jumlah transaksi
      {
        opposite: true,
        seriesName: "Transaksi",
        labels: {
          formatter: (val) => `${Math.round(val)}`,
          style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" },
        },
      },
    ],
    grid: { yaxis: { lines: { show: true } } },
    markers: {
      size: [0, 0, 3, 3, 3],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 5 },
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: { fontFamily: "Outfit, sans-serif" },
    },
  };

  const series = [
    { name: "Pemasukan",  type: "bar",  data: creditData },
    { name: "Pengeluaran", type: "bar", data: debitData },
    { name: "Net Flow",   type: "line", data: netFlowData },
    { name: "Saldo",      type: "line", data: balanceData },
    { name: "Transaksi",  type: "line", data: txCountData },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cash Flow</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel ?? "Ringkasan keuangan"}</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#12B76A] inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Masuk: <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(totalCredit)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F04438] inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Keluar: <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(totalDebit)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#465FFF] inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Net Flow: <span className={`font-semibold ${totalNet >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>{fmt(totalNet)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F79009] inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Saldo: <span className={`font-semibold ${lastBalance >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>{fmt(lastBalance)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] inline-block" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Transaksi: <span className="font-semibold text-gray-700 dark:text-gray-200">{totalTx}x</span></span>
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : (
        <div className="max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="min-w-[500px]">
            <Chart
              options={options}
              series={series}
              type="line"
              height={280}
            />
          </div>
        </div>
      )}
    </div>
  );
}
