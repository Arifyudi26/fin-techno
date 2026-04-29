import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import FinanceMetrics from "@components/finance/FinanceMetrics";
import FinanceTrendChart from "@/components/finance/FinanceTrendChart";
import SpendingByCategory from "@components/finance/SpendingByCategory";
import RecentTransactions from "@components/finance/RecentTransactions";
import BankAccountSummary from "@components/finance/BankAccountSummary";
import DashboardFilters from "@components/finance/DashboardFilters";
import axiosGlobal from "@/services/AxiosGlobal";
import { useI18n } from "@lib/i18n";
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
  incomeByCategory: SpendingCategory[];
  recentTransactions: RecentTransaction[];
}

interface LoadingState {
  metrics: boolean;
  cashflow: boolean;
  accounts: boolean;
  transactions: boolean;
}

function getDefaultFilters(): IFilters {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateFrom = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const dateTo = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    dateFrom,
    dateTo,
    accountId: null,
    accountType: null,
    categoryId: null,
    txType: null,
  };
}

const DEFAULT_FILTERS: IFilters = getDefaultFilters();

function buildParams(
  filters: IFilters,
  extra?: Record<string, string | number>,
) {
  const p: Record<string, string> = {};
  if (filters.dateFrom) p.dateFrom = filters.dateFrom;
  if (filters.dateTo) p.dateTo = filters.dateTo;
  if (filters.accountId) p.accountId = filters.accountId;
  if (filters.accountType) p.accountType = filters.accountType;
  if (filters.categoryId) p.categoryId = filters.categoryId;
  if (filters.txType) p.type = filters.txType;
  if (extra)
    Object.entries(extra).forEach(([k, v]) => {
      p[k] = String(v);
    });
  return p;
}

export default function Home() {
  const { t } = useI18n();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  const [data, setData] = useState<DashboardState>({
    metrics: null,
    cashFlow: [],
    netFlowTrend: [],
    bankAccounts: [],
    spendingByCategory: [],
    incomeByCategory: [],
    recentTransactions: [],
  });

  const [allCategories, setAllCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const [loading, setLoading] = useState<LoadingState>({
    metrics: true,
    cashflow: true,
    accounts: true,
    transactions: true,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof LoadingState, string>>
  >({});
  const [filters, setFilters] = useState<IFilters>(DEFAULT_FILTERS);

  const fetchMetrics = useCallback(async (f: IFilters) => {
    setLoading((prev) => ({ ...prev, metrics: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/metrics", {
        params: buildParams(f),
      });
      setData((prev) => ({ ...prev, metrics: res.data }));
      setErrors((prev) => ({ ...prev, metrics: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, metrics: tRef.current.dashboard.errorMetrics }));
    } finally {
      setLoading((prev) => ({ ...prev, metrics: false }));
    }
  }, []);

  const fetchCashflow = useCallback(async (f: IFilters) => {
    setLoading((prev) => ({ ...prev, cashflow: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/cashflow", {
        params: buildParams(f),
      });
      setData((prev) => ({
        ...prev,
        cashFlow: res.data.cashFlow,
        netFlowTrend: res.data.netFlowTrend,
      }));
      setErrors((prev) => ({ ...prev, cashflow: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, cashflow: tRef.current.dashboard.errorCashflow }));
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
      setErrors((prev) => ({ ...prev, accounts: tRef.current.dashboard.errorAccounts }));
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  }, []);

  const fetchAllCategories = useCallback(async () => {
    try {
      const res = await axiosGlobal.get("/categories");
      setAllCategories(
        res.data.categories.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        })),
      );
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchTransactions = useCallback(async (f: IFilters) => {
    setLoading((prev) => ({ ...prev, transactions: true }));
    try {
      const res = await axiosGlobal.get("/dashboard/transactions", {
        params: buildParams(f, { limit: 15 }),
      });
      setData((prev) => ({
        ...prev,
        recentTransactions: res.data.recentTransactions,
        spendingByCategory: res.data.spendingByCategory,
        incomeByCategory: res.data.incomeByCategory ?? [],
      }));
      setErrors((prev) => ({ ...prev, transactions: undefined }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        transactions: tRef.current.dashboard.errorTransactions,
      }));
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics(DEFAULT_FILTERS);
    fetchCashflow(DEFAULT_FILTERS);
    fetchAccounts();
    fetchTransactions(DEFAULT_FILTERS);
    fetchAllCategories();
  }, [
    fetchMetrics,
    fetchCashflow,
    fetchAccounts,
    fetchTransactions,
    fetchAllCategories,
  ]);

  const handleFilterChange = useCallback(
    (partial: Partial<IFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...partial };
        fetchMetrics(next);
        fetchCashflow(next);
        fetchTransactions(next);
        return next;
      });
    },
    [fetchMetrics, fetchCashflow, fetchTransactions],
  );

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    fetchMetrics(DEFAULT_FILTERS);
    fetchCashflow(DEFAULT_FILTERS);
    fetchTransactions(DEFAULT_FILTERS);
  }, [fetchMetrics, fetchCashflow, fetchTransactions]);

  const handleAccountSelect = useCallback(
    (id: string | null, type: "BANK" | "WALLET" | null) => {
      handleFilterChange({ accountId: id, accountType: type });
    },
    [handleFilterChange],
  );

  const errorMessages = Object.values(errors).filter(Boolean);

  return (
    <AppLayout>
      <PageMeta
        title={`${t.dashboard.title} | Fin-Techno`}
        description={t.dashboard.description}
      />

      {errorMessages.length > 0 && (
        <div className="mb-4 space-y-1">
          {errorMessages.map((msg, i) => (
            <div
              key={i}
              className="rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400"
            >
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
          categories={allCategories}
          activePeriodLabel={data.metrics?.activePeriod?.label}
          onChange={handleFilterChange}
          onReset={handleReset}
          defaultDateFrom={DEFAULT_FILTERS.dateFrom ?? ""}
          defaultDateTo={DEFAULT_FILTERS.dateTo ?? ""}
        />
      </div>

      <div className="grid grid-cols-12 gap-3 md:gap-5">
        {/* Metrics — 5 cards */}
        <div className="col-span-12">
          <FinanceMetrics
            data={data.metrics ?? undefined}
            loading={loading.metrics}
          />
        </div>

        <div className="col-span-12">
          <FinanceTrendChart
            data={data.cashFlow}
            netFlowTrend={data.netFlowTrend}
            loading={loading.cashflow}
            periodLabel={data.metrics?.activePeriod?.label}
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

        <div className="col-span-12 xl:col-span-8">
          <SpendingByCategory
            data={data.spendingByCategory}
            incomeData={data.incomeByCategory}
            loading={loading.transactions}
          />
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
