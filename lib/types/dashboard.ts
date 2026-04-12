export interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  totalBalance: number;
  transactionCount: number;
  activePeriod?: {
    month: number;
    year: number;
    label: string;
  };
  changes: {
    income: string;
    expense: string;
    netFlow: string;
    transactions: string;
  };
  isUp: {
    income: boolean;
    expense: boolean;
    netFlow: boolean;
    transactions: boolean;
  };
}

export interface CashFlowMonth {
  month: string;
  credit: number;
  debit: number;
}

export interface BankAccountBalance {
  id: string;
  bankProvider: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
  source?: "BANK" | "WALLET";
}

export interface SpendingCategory {
  id?: string;
  category: string;
  amount: number;
  count?: number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  category: string;
  categories?: { id: string; name: string }[];
  bankAccount: string;
  source?: "BANK" | "WALLET";
  status: string;
  reference: string | null;
}

export interface NetFlowPoint {
  month: string;
  netFlow: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  cashFlow: CashFlowMonth[];
  bankAccounts: BankAccountBalance[];
  spendingByCategory: SpendingCategory[];
  recentTransactions: RecentTransaction[];
  netFlowTrend: NetFlowPoint[];
}

export interface DashboardFilters {
  month: number | null;
  year: number | null;
  accountId: string | null;
  accountType: "BANK" | "WALLET" | null;
  categoryId: string | null;
  txType: "CREDIT" | "DEBIT" | null;
}
