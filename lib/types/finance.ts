// AI Chat
export interface ChatMessage {
  id: string;
  role: "user" | "model";
  parts: string;
  timestamp: Date;
}

// AI Insights
export interface AnalysisContext {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  negativeMonths: number;
  maxExpenseMonth?: { label: string; debit: number };
  topCategories: { name: string; amount: number }[];
}

// Period Cash Flow Chart
export interface DailyPoint {
  date: string;
  credit: number;
  debit: number;
}

// Report Filters
export interface ReportFilterState {
  dateFrom: string;
  dateTo: string;
  accountId: string | null;
  accountType: "BANK" | "WALLET" | null;
}
