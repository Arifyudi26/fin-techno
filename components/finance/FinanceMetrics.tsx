import { ArrowDownIcon, ArrowUpIcon } from "@components/icons";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export default function FinanceMetrics() {
  const metrics = [
    {
      label: "Total Pemasukan",
      value: 48_500_000,
      change: "+12.5%",
      up: true,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 5a1 1 0 10-2 0v4H7a1 1 0 100 2h4v4a1 1 0 102 0v-4h4a1 1 0 100-2h-4V7z" fill="currentColor" />
        </svg>
      ),
      color: "text-success-500 dark:text-success-400",
      bg: "bg-success-50 dark:bg-success-500/10",
    },
    {
      label: "Total Pengeluaran",
      value: 31_200_000,
      change: "+4.2%",
      up: false,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4 11H8a1 1 0 110-2h8a1 1 0 110 2z" fill="currentColor" />
        </svg>
      ),
      color: "text-error-500 dark:text-error-400",
      bg: "bg-error-50 dark:bg-error-500/10",
    },
    {
      label: "Net Flow",
      value: 17_300_000,
      change: "+8.1%",
      up: true,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12h20M12 2l4 4-4 4M12 22l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "text-brand-500 dark:text-brand-400",
      bg: "bg-brand-50 dark:bg-brand-500/10",
    },
    {
      label: "Transaksi Bulan Ini",
      value: 247,
      isCount: true,
      change: "+18",
      up: true,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "text-warning-500 dark:text-warning-400",
      bg: "bg-warning-50 dark:bg-warning-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${m.bg}`}>
            <span className={m.color}>{m.icon}</span>
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{m.label}</span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {m.isCount ? m.value.toLocaleString("id-ID") : formatIDR(m.value)}
              </h4>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.up ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"}`}>
              {m.up ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {m.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
