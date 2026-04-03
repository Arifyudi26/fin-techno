import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export default function SpendingByCategory() {
  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 260,
    },
    colors: ["#465FFF", "#12B76A", "#F79009", "#F04438", "#7A5AF8", "#0BA5EC"],
    labels: ["Operasional", "Gaji", "Pajak", "Utilitas", "Investasi", "Lainnya"],
    legend: {
      show: true,
      position: "bottom",
      fontFamily: "Outfit",
      fontSize: "13px",
    },
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
              formatter: () => "Rp 31,2jt",
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val),
      },
    },
  };

  const series = [9_500_000, 8_200_000, 4_100_000, 3_800_000, 3_200_000, 2_400_000];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Pengeluaran per Kategori</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Distribusi pengeluaran bulan ini</p>
      <Chart options={options} series={series} type="donut" height={260} />
    </div>
  );
}
