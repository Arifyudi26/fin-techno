import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SpendingCategory } from "@/lib/types/dashboard";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

interface Props {
  data?: SpendingCategory[];
  loading?: boolean;
}

export default function SpendingByCategory({ data = [], loading }: Props) {
  const labels = data.map((d) => d.category);
  const series = data.map((d) => d.amount);
  const total = series.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", height: 260 },
    colors: ["#465FFF", "#12B76A", "#F79009", "#F04438", "#7A5AF8", "#0BA5EC"],
    labels,
    legend: { show: true, position: "bottom", fontFamily: "Outfit", fontSize: "13px" },
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
              fontSize: "13px",
              fontFamily: "Outfit",
              color: "#667085",
              formatter: () => formatIDR(total),
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: (val) => formatIDR(val) },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Pengeluaran per Kategori</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Distribusi pengeluaran bulan ini</p>
      {loading ? (
        <div className="h-[260px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ) : series.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Belum ada data pengeluaran
        </div>
      ) : (
        <Chart options={options} series={series} type="donut" height={260} />
      )}
    </div>
  );
}
