/**
 * Shared helpers, types, and chart renderers for dashboard export.
 * Both Excel and PDF use the exact same data sections defined here.
 */

import {
  DashboardMetrics,
  CashFlowMonth,
  NetFlowPoint,
  SpendingCategory,
  RecentTransaction,
  BankAccountBalance,
  DashboardFilters,
} from "@/lib/types/dashboard";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface ExportPayload {
  filters: DashboardFilters;
  metrics: DashboardMetrics | null;
  cashFlow: CashFlowMonth[];
  netFlowTrend: NetFlowPoint[];
  spendingByCategory: SpendingCategory[];
  incomeByCategory: SpendingCategory[];
  recentTransactions: RecentTransaction[];
  bankAccounts: BankAccountBalance[];
}

// ─── Canonical data sections ──────────────────────────────────────────────────
// These are the exact same sections used by BOTH Excel and PDF.
// Adding/removing a field here automatically keeps both formats in sync.

export interface MetricRow {
  label: string;
  value: number | string;
  change: string;
  up: boolean;
  colorKey: "success" | "danger" | "brand" | "warn" | "purple";
}

export interface AccountRow {
  provider: string;
  number: string;
  name: string;
  balance: number;
  type: string;
}

export interface CashFlowRow {
  period: string;
  income: number;
  expense: number;
  netFlow: number;
  txCount: number;
}

export interface NetFlowRow {
  period: string;
  netFlow: number;
  balance: number;
  txCount: number;
}

export interface CategoryRow {
  category: string;
  amount: number;
  pct: number;
  count: number;
}

export interface TxRow {
  date: string;
  description: string;
  account: string;
  category: string;
  type: "Pemasukan" | "Pengeluaran";
  amount: number;       // always positive
  signed: number;       // positive for credit, negative for debit
  status: string;
  reference: string;
}

export interface CanonicalData {
  filterLabel: string;
  generatedAt: string;
  metrics: MetricRow[];
  accounts: AccountRow[];
  accountTotalBalance: number;
  cashFlow: CashFlowRow[];
  cashFlowTotals: { income: number; expense: number; netFlow: number };
  netFlowTrend: NetFlowRow[];
  spendingCategories: CategoryRow[];
  spendingTotal: number;
  incomeCategories: CategoryRow[];
  incomeTotal: number;
  transactions: TxRow[];
  txTotalIn: number;
  txTotalOut: number;
}

export function buildCanonicalData(p: ExportPayload): CanonicalData {
  const label = filterLabel(p.filters);
  const dateStr = new Date().toLocaleString("id-ID");

  // Metrics
  const metrics: MetricRow[] = p.metrics
    ? [
        { label: "Total Pemasukan",   value: p.metrics.totalIncome,       change: p.metrics.changes.income,       up: p.metrics.isUp.income,       colorKey: "success" },
        { label: "Total Pengeluaran", value: p.metrics.totalExpense,       change: p.metrics.changes.expense,      up: p.metrics.isUp.expense,      colorKey: "danger"  },
        { label: "Net Flow",          value: p.metrics.netFlow,            change: p.metrics.changes.netFlow,      up: p.metrics.isUp.netFlow,      colorKey: "brand"   },
        { label: "Total Saldo",       value: p.metrics.totalBalance,       change: "",                             up: true,                        colorKey: "warn"    },
        { label: "Jumlah Transaksi",  value: p.metrics.transactionCount,   change: p.metrics.changes.transactions, up: p.metrics.isUp.transactions, colorKey: "purple"  },
      ]
    : [];

  // Accounts
  const accounts: AccountRow[] = p.bankAccounts.map((a) => ({
    provider: a.bankProvider,
    number:   a.accountNumber,
    name:     a.accountName,
    balance:  a.balance,
    type:     a.source ?? "BANK",
  }));
  const accountTotalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Cash Flow
  const cashFlow: CashFlowRow[] = p.cashFlow.map((r) => ({
    period:   r.month,
    income:   r.credit,
    expense:  r.debit,
    netFlow:  r.credit - r.debit,
    txCount:  r.txCount ?? 0,
  }));
  const cashFlowTotals = {
    income:  cashFlow.reduce((s, r) => s + r.income, 0),
    expense: cashFlow.reduce((s, r) => s + r.expense, 0),
    netFlow: cashFlow.reduce((s, r) => s + r.netFlow, 0),
  };

  // Net Flow Trend
  const netFlowTrend: NetFlowRow[] = p.netFlowTrend.map((r) => ({
    period:  r.month,
    netFlow: r.netFlow,
    balance: r.balance ?? 0,
    txCount: r.txCount ?? 0,
  }));

  // Spending categories
  const sortedSpend = [...p.spendingByCategory].sort((a, b) => b.amount - a.amount);
  const spendingTotal = sortedSpend.reduce((s, c) => s + c.amount, 0);
  const spendingCategories: CategoryRow[] = sortedSpend.map((c) => ({
    category: c.category,
    amount:   c.amount,
    pct:      spendingTotal > 0 ? +((c.amount / spendingTotal) * 100).toFixed(1) : 0,
    count:    c.count ?? 0,
  }));

  // Income categories
  const sortedIncome = [...p.incomeByCategory].sort((a, b) => b.amount - a.amount);
  const incomeTotal = sortedIncome.reduce((s, c) => s + c.amount, 0);
  const incomeCategories: CategoryRow[] = sortedIncome.map((c) => ({
    category: c.category,
    amount:   c.amount,
    pct:      incomeTotal > 0 ? +((c.amount / incomeTotal) * 100).toFixed(1) : 0,
    count:    c.count ?? 0,
  }));

  // Transactions
  const transactions: TxRow[] = p.recentTransactions.map((tx) => ({
    date:        fmtDateShort(tx.date),
    description: tx.description,
    account:     tx.bankAccount,
    category:    tx.categories?.map((c) => c.name).join(", ") || tx.category || "-",
    type:        tx.type === "CREDIT" ? "Pemasukan" : "Pengeluaran",
    amount:      tx.amount,
    signed:      tx.type === "CREDIT" ? tx.amount : -tx.amount,
    status:      tx.status,
    reference:   tx.reference ?? "-",
  }));
  const txTotalIn  = transactions.filter((t) => t.type === "Pemasukan").reduce((s, t) => s + t.amount, 0);
  const txTotalOut = transactions.filter((t) => t.type === "Pengeluaran").reduce((s, t) => s + t.amount, 0);

  return {
    filterLabel: label,
    generatedAt: dateStr,
    metrics,
    accounts,
    accountTotalBalance,
    cashFlow,
    cashFlowTotals,
    netFlowTrend,
    spendingCategories,
    spendingTotal,
    incomeCategories,
    incomeTotal,
    transactions,
    txTotalIn,
    txTotalOut,
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

export function fmtDateShort(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function filterLabel(f: DashboardFilters): string {
  const parts: string[] = [];
  if (f.dateFrom) parts.push(`Dari: ${f.dateFrom}`);
  if (f.dateTo)   parts.push(`Sampai: ${f.dateTo}`);
  if (f.txType)   parts.push(`Tipe: ${f.txType === "CREDIT" ? "Pemasukan" : "Pengeluaran"}`);
  return parts.length ? parts.join("  |  ") : "Semua periode";
}

export const CHART_COLORS = [
  "#465FFF", "#12B76A", "#F79009", "#F04438",
  "#7A5AF8", "#0BA5EC", "#EE46BC", "#16B364",
];

// ─── Chart renderers ──────────────────────────────────────────────────────────
// Menggunakan ApexCharts (sudah ada di project) karena dataURI() dijamin render.

async function apexDataURI(options: object): Promise<string> {
  // ApexCharts butuh container div di DOM
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = "-9999px";
  div.style.top = "-9999px";
  div.style.width = "900px";
  div.style.height = "350px";
  document.body.appendChild(div);

  const ApexCharts = (await import("apexcharts")).default;
  const chart = new ApexCharts(div, options);
  await chart.render();

  const { imgURI } = await chart.dataURI() as { imgURI: string };
  chart.destroy();
  document.body.removeChild(div);
  return imgURI;
}

export async function renderBarChartPng(
  labels: string[],
  datasets: { label: string; data: number[]; color: string }[],
  width = 900,
  height = 350,
): Promise<string> {
  return apexDataURI({
    chart: {
      type: "bar",
      width,
      height,
      toolbar: { show: false },
      animations: { enabled: false },
      background: "#ffffff",
      fontFamily: "Arial, sans-serif",
    },
    series: datasets.map((d) => ({ name: d.label, data: d.data })),
    xaxis: { categories: labels, labels: { style: { fontSize: "11px" } } },
    yaxis: {
      labels: {
        formatter: (v: number) => `${(v / 1_000_000).toFixed(0)}jt`,
        style: { fontSize: "11px" },
      },
    },
    colors: datasets.map((d) => d.color),
    dataLabels: { enabled: false },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
    legend: { position: "top", fontSize: "12px" },
    grid: { yaxis: { lines: { show: true } } },
    stroke: { show: true, width: 1, colors: datasets.map((d) => d.color) },
    theme: { mode: "light" },
  });
}

export async function renderDonutChartPng(
  labels: string[],
  data: number[],
  title: string,
  width = 600,
  height = 400,
): Promise<string> {
  return apexDataURI({
    chart: {
      type: "donut",
      width,
      height,
      toolbar: { show: false },
      animations: { enabled: false },
      background: "#ffffff",
      fontFamily: "Arial, sans-serif",
    },
    series: data,
    labels,
    colors: CHART_COLORS,
    dataLabels: { enabled: true, formatter: (_: unknown, opts: { seriesIndex: number; w: { globals: { series: number[] } } }) => {
      const total = opts.w.globals.series.reduce((a: number, b: number) => a + b, 0);
      const pct = total > 0 ? ((opts.w.globals.series[opts.seriesIndex] / total) * 100).toFixed(1) : "0";
      return `${pct}%`;
    }},
    legend: { position: "right", fontSize: "11px" },
    title: { text: title, align: "center", style: { fontSize: "13px", fontWeight: "bold" } },
    plotOptions: { pie: { donut: { size: "60%" } } },
    theme: { mode: "light" },
  });
}
