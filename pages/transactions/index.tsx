import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import RecentTransactions from "@components/finance/RecentTransactions";

export default function Transactions() {
  return (
    <AppLayout>
      <PageMeta title="Semua Transaksi | MyFinance" description="Daftar semua transaksi dari seluruh rekening" />
      <PageBreadcrumb pageTitle="Semua Transaksi" />
      <RecentTransactions />
    </AppLayout>
  );
}
