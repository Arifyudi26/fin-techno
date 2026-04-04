export interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  totalBalance: number;
  transactionCount: number;
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
}

export interface SpendingCategory {
  category: string;
  amount: number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  category: string;
  bankAccount: string;
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
