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
import {
  DashboardMetrics,
  CashFlowMonth,
  BankAccountBalance,
  SpendingCategory,
  RecentTransaction,
  NetFlowPoint,
} from "@/lib/types/dashboard";

interface DashboardState {
  metrics: DashboardMetrics | null;
  cashFlow: CashFlowMonth[];
  netFlowTrend: NetFlowPoint[];
  bankAccounts: BankAccountBalance[];
  spendingByCategory: SpendingCategory[];
  recentTransactions: RecentTransaction[];
}

interface LoadingState {
  metrics: boolean;
  cashflow: boolean;
  accounts: boolean;
  transactions: boolean;
}

export default function Home() {
  const [data, setData] = useState<DashboardState>({
    metrics: null,
    cashFlow: [],
    netFlowTrend: [],
    bankAccounts: [],
    spendingByCategory: [],
    recentTransactions: [],
  });

  const [loading, setLoading] = useState<LoadingState>({
    metrics: true,
    cashflow: true,
    accounts: true,
    transactions: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoadingState, string>>>({});

  useEffect(() => {
    // Hit semua 4 API secara paralel — tidak saling tunggu
    const fetchMetrics = async () => {
      try {
        const res = await axiosGlobal.get("/dashboard/metrics");
        setData((prev) => ({ ...prev, metrics: res.data }));
      } catch {
        setErrors((prev) => ({ ...prev, metrics: "Gagal memuat metrik" }));
      } finally {
        setLoading((prev) => ({ ...prev, metrics: false }));
      }
    };

    const fetchCashflow = async () => {
      try {
        const res = await axiosGlobal.get("/dashboard/cashflow");
        setData((prev) => ({
          ...prev,
          cashFlow: res.data.cashFlow,
          netFlowTrend: res.data.netFlowTrend,
        }));
      } catch {
        setErrors((prev) => ({ ...prev, cashflow: "Gagal memuat cash flow" }));
      } finally {
        setLoading((prev) => ({ ...prev, cashflow: false }));
      }
    };

    const fetchAccounts = async () => {
      try {
        const res = await axiosGlobal.get("/dashboard/accounts");
        setData((prev) => ({ ...prev, bankAccounts: res.data }));
      } catch {
        setErrors((prev) => ({ ...prev, accounts: "Gagal memuat rekening" }));
      } finally {
        setLoading((prev) => ({ ...prev, accounts: false }));
      }
    };

    const fetchTransactions = async () => {
      try {
        const res = await axiosGlobal.get("/dashboard/transactions");
        setData((prev) => ({
          ...prev,
          recentTransactions: res.data.recentTransactions,
          spendingByCategory: res.data.spendingByCategory,
        }));
      } catch {
        setErrors((prev) => ({ ...prev, transactions: "Gagal memuat transaksi" }));
      } finally {
        setLoading((prev) => ({ ...prev, transactions: false }));
      }
    };

    // Jalankan semua paralel
    fetchMetrics();
    fetchCashflow();
    fetchAccounts();
    fetchTransactions();
  }, []);

  const errorMessages = Object.values(errors).filter(Boolean);

  return (
    <AppLayout>
      <PageMeta
        title="Dashboard Keuangan | MyFinance"
        description="Overview keuangan — pemasukan, pengeluaran, dan net flow dari semua rekening"
      />

      {errorMessages.length > 0 && (
        <div className="mb-4 space-y-1">
          {errorMessages.map((msg, i) => (
            <div key={i} className="rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
              {msg}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <FinanceMetrics data={data.metrics ?? undefined} loading={loading.metrics} />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <CashFlowChart data={data.cashFlow} loading={loading.cashflow} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <BankAccountSummary data={data.bankAccounts} loading={loading.accounts} />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <NetFlowChart data={data.netFlowTrend} loading={loading.cashflow} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <SpendingByCategory data={data.spendingByCategory} loading={loading.transactions} />
        </div>

        <div className="col-span-12">
          <RecentTransactions data={data.recentTransactions} loading={loading.transactions} />
        </div>
      </div>
    </AppLayout>
  );
}
