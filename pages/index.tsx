import { useEffect, useState } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import FinanceMetrics from "@components/finance/FinanceMetrics";
import CashFlowChart from "@components/finance/CashFlowChart";
import NetFlowChart from "@components/finance/NetFlowChart";
import SpendingByCategory from "@components/finance/SpendingByCategory";
import RecentTransactions from "@components/finance/RecentTransactions";
import BankAccountSummary from "@components/finance/BankAccountSummary";
import axiosGlobal from "@/services/AxiosGlobal";
import { DashboardData } from "@/lib/types/dashboard";

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await axiosGlobal.get("/dashboard");
        setData(res.data);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })
          .response?.data?.message || "Gagal memuat data dashboard";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <AppLayout>
      <PageMeta
        title="Dashboard Keuangan | MyFinance"
        description="Overview keuangan — pemasukan, pengeluaran, dan net flow dari semua rekening"
      />

      {error && (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <FinanceMetrics data={data?.metrics} loading={loading} />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <CashFlowChart data={data?.cashFlow} loading={loading} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <BankAccountSummary data={data?.bankAccounts} loading={loading} />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <NetFlowChart data={data?.netFlowTrend} loading={loading} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <SpendingByCategory data={data?.spendingByCategory} loading={loading} />
        </div>

        <div className="col-span-12">
          <RecentTransactions data={data?.recentTransactions} loading={loading} />
        </div>
      </div>
    </AppLayout>
  );
}
