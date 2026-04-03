import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import FinanceMetrics from "@components/finance/FinanceMetrics";
import CashFlowChart from "@components/finance/CashFlowChart";
import NetFlowChart from "@components/finance/NetFlowChart";
import SpendingByCategory from "@components/finance/SpendingByCategory";
import RecentTransactions from "@components/finance/RecentTransactions";
import BankAccountSummary from "@components/finance/BankAccountSummary";

export default function Home() {
  return (
    <AppLayout>
      <PageMeta
        title="Dashboard Keuangan | MyFinance"
        description="Overview keuangan — pemasukan, pengeluaran, dan net flow dari semua rekening"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Metrics row */}
        <div className="col-span-12">
          <FinanceMetrics />
        </div>

        {/* Cash flow chart + bank summary */}
        <div className="col-span-12 xl:col-span-8">
          <CashFlowChart />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <BankAccountSummary />
        </div>

        {/* Net flow trend + spending by category */}
        <div className="col-span-12 xl:col-span-7">
          <NetFlowChart />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <SpendingByCategory />
        </div>

        {/* Recent transactions */}
        <div className="col-span-12">
          <RecentTransactions />
        </div>
      </div>
    </AppLayout>
  );
}
