import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import CashFlowChart from "@components/finance/CashFlowChart";
import NetFlowChart from "@components/finance/NetFlowChart";

export default function CashFlowReport() {
  return (
    <AppLayout>
      <PageMeta title="Laporan Cash Flow | MyFinance" description="Laporan arus kas pemasukan dan pengeluaran" />
      <PageBreadcrumb pageTitle="Laporan Cash Flow" />
      <div className="grid grid-cols-1 gap-6">
        <CashFlowChart />
        <NetFlowChart />
      </div>
    </AppLayout>
  );
}