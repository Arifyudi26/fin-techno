import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import FinanceMetrics from "@components/finance/FinanceMetrics";
import CashFlowChart from "@components/finance/CashFlowChart";
import NetFlowChart from "@components/finance/NetFlowChart";
import SpendingByCategory from "@components/finance/SpendingByCategory";
import RecentTransactions from "@components/finance/RecentTransactions";
import BankAccountSummary from "@components/finance/BankAccountSummary";
import DashboardFilters from "@components/finance/DashboardFilters";
import axiosGlobal from "@/services/AxiosGlobal";
import {
  DashboardMetrics,
  CashFlowMonth,
  BankAccountBalance,
  SpendingCategory,
  RecentTransaction,
  NetFlowPoint,
  DashboardFilters as IFilters,
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

const DEFAULT_FILTERS: IFilters = {
  month: null,
  year: null,
  accountId: null,
  accountType: null,
  categoryId: null,
  txType: null,
  search: "",
};

function buildParams(filters: IFilters, extra?: Record<string, string | number>) {
  const p: Record<string, string> = {};
  if (filters.month != null) p.month = String(filters.month);
  if (filters.year != null) p.year = String(filters.year);
  if (filters.accountId) p.accountId = filters.accountId;
  if (filters.accountType) p.accountType = filters.accountType;
  if (filters.categoryId) p.categoryId = filters.categoryId;
  if (filters.txType) p.type = filters.txType;
  if (filters.search) p.search = filters.search;
  if (extra) Object.entries(extra).forEach(([k, v]) => { p[k] = String(v); });
  return p;
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
  const [filters, setFilters] = useState<IFilters>(DEFAULT_FILTERS);
  const [cashflowMonths, setCashflowMonths] = useState(12);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMetrics = useCallback(async (f: IFilters) => {
    setLoading((prev) => ({ ...prev, metrics: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/metrics", { params: buildParams(f) });
      setData((prev) => ({ ...prev, metrics: res.data }));
      setErrors((prev) => ({ ...prev, metrics: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, metrics: "Gagal memuat metrik" }));
    } finally {
      setLoading((prev) => ({ ...prev, metrics: false }));
    }
  }, []);

  const fetchCashflow = useCallback(async (f: IFilters, months: number) => {
    setLoading((prev) => ({ ...prev, cashflow: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/cashflow", { params: buildParams(f, { months }) });
      setData((prev) => ({ ...prev, cashFlow: res.data.cashFlow, netFlowTrend: res.data.netFlowTrend }));
      setErrors((prev) => ({ ...prev, cashflow: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, cashflow: "Gagal memuat cash flow" }));
    } finally {
      setLoading((prev) => ({ ...prev, cashflow: false }));
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoading((prev) => ({ ...prev, accounts: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/accounts");
      setData((prev) => ({ ...prev, bankAccounts: res.data }));
      setErrors((prev) => ({ ...prev, accounts: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, accounts: "Gagal memuat rekening" }));
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  }, []);

  const fetchTransactions = useCallback(async (f: IFilters) => {
    setLoading((prev) => ({ ...prev, transactions: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/transactions", { params: buildParams(f, { limit: 15 }) });
      setData((prev) => ({
        ...prev,
        recentTransactions: res.data.recentTransactions,
        spendingByCategory: res.data.spendingByCategory,
      }));
      setErrors((prev) => ({ ...prev, transactions: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, transactions: "Gagal memuat transaksi" }));
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics(DEFAULT_FILTERS);
    fetchCashflow(DEFAULT_FILTERS, 12);
    fetchAccounts();
    fetchTransactions(DEFAULT_FILTERS);
  }, [fetchMetrics, fetchCashflow, fetchAccounts, fetchTransactions]);

  // Re-fetch when filters change (debounce search)
  const handleFilterChange = useCallback((partial: Partial<IFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };

      if (searchTimer.current) clearTimeout(searchTimer.current);

      if ("search" in partial) {
        // Debounce search 400ms
        searchTimer.current = setTimeout(() => {
          fetchMetrics(next);
          fetchCashflow(next, cashflowMonths);
          fetchTransactions(next);
        }, 400);
      } else {
        fetchMetrics(next);
        fetchCashflow(next, cashflowMonths);
        fetchTransactions(next);
      }

      return next;
    });
  }, [fetchMetrics, fetchCashflow, fetchTransactions, cashflowMonths]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    fetchMetrics(DEFAULT_FILTERS);
    fetchCashflow(DEFAULT_FILTERS, cashflowMonths);
    fetchTransactions(DEFAULT_FILTERS);
  }, [fetchMetrics, fetchCashflow, fetchTransactions, cashflowMonths]);

  const handleAccountSelect = useCallback((id: string | null, type: "BANK" | "WALLET" | null) => {
    handleFilterChange({ accountId: id, accountType: type });
  }, [handleFilterChange]);

  const handleCashflowMonths = useCallback((m: number) => {
    setCashflowMonths(m);
    fetchCashflow(filters, m);
  }, [fetchCashflow, filters]);

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

      {/* Filter bar */}
      <div className="mb-5">
        <DashboardFilters
          filters={filters}
          accounts={data.bankAccounts}
          categories={data.spendingByCategory}
          activePeriodLabel={data.metrics?.activePeriod?.label}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Metrics — 5 cards */}
        <div className="col-span-12">
          <FinanceMetrics data={data.metrics ?? undefined} loading={loading.metrics} />
        </div>

        {/* Cash Flow + Accounts */}
        <div className="col-span-12 xl:col-span-8">
          <CashFlowChart
            data={data.cashFlow}
            loading={loading.cashflow}
            months={cashflowMonths}
            onMonthsChange={handleCashflowMonths}
          />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <BankAccountSummary
            data={data.bankAccounts}
            loading={loading.accounts}
            selectedAccountId={filters.accountId}
            onSelectAccount={handleAccountSelect}
          />
        </div>

        {/* Net Flow + Spending */}
        <div className="col-span-12 xl:col-span-7">
          <NetFlowChart data={data.netFlowTrend} loading={loading.cashflow} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <SpendingByCategory data={data.spendingByCategory} loading={loading.transactions} />
        </div>

        {/* Recent Transactions */}
        <div className="col-span-12">
          <RecentTransactions
            data={data.recentTransactions}
            loading={loading.transactions}
          />
        </div>
      </div>
    </AppLayout>
  );
}
