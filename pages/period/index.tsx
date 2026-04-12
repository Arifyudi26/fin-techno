import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import Pagination from "@components/ui/pagination/Pagination";
import axiosGlobal from "@/services/AxiosGlobal";

const PeriodCashFlowChart = dynamic(() => import("@components/finance/PeriodCashFlowChart"), { ssr: false });
const PeriodDonutChart = dynamic(() => import("@components/finance/PeriodDonutChart"), { ssr: false });

const formatIDR = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const COLORS = [
  "#465FFF",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

interface Summary {
  totalCredit: number;
  totalDebit: number;
  netFlow: number;
  transactionCount: number;
  bankCount: number;
  walletCount: number;
  periodStart: string;
  periodEnd: string;
}
interface BySource {
  provider: string;
  accountName: string;
  source: string;
  credit: number;
  debit: number;
  count: number;
}
interface ByCategory {
  name: string;
  credit: number;
  debit: number;
  count: number;
}
interface DailyPoint {
  date: string;
  credit: number;
  debit: number;
}
interface TxRow {
  id: string;
  source: string;
  date: string;
  description: string;
  reference: string | null;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance: number | null;
  category: string;
  provider: string;
  accountName: string;
}

// Get first and last day of current month as default
const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

export default function PeriodAnalysis() {
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [source, setSource] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [bySource, setBySource] = useState<BySource[]>([]);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [txFilter, setTxFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [txSearch, setTxSearch] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);

  const fetchData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const res = await axiosGlobal.get(
        `/reports/period?dateFrom=${dateFrom}&dateTo=${dateTo}&source=${source}`,
      );
      setSummary(res.data.summary);
      setBySource(res.data.bySource);
      setByCategory(res.data.byCategory);
      setDaily(res.data.dailyCashflow);
      setTransactions(res.data.transactions);
      setHasData(true);
    } catch {
      setSummary(null);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, source]);

  const filteredTx = transactions.filter((t) => {
    const matchType = txFilter === "ALL" || t.type === txFilter;
    const matchSearch =
      !txSearch ||
      t.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.provider.toLowerCase().includes(txSearch.toLowerCase());
    return matchType && matchSearch;
  });

  const txTotalPages = Math.ceil(filteredTx.length / txLimit);
  const pagedTx = filteredTx.slice((txPage - 1) * txLimit, txPage * txLimit);

  // Quick period presets
  const setPreset = (preset: string) => {
    const now = new Date();
    if (preset === "thisMonth") {
      setDateFrom(
        new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0],
      );
      setDateTo(now.toISOString().split("T")[0]);
    } else if (preset === "lastMonth") {
      setDateFrom(
        new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .split("T")[0],
      );
      setDateTo(
        new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .split("T")[0],
      );
    } else if (preset === "last3") {
      setDateFrom(
        new Date(now.getFullYear(), now.getMonth() - 2, 1)
          .toISOString()
          .split("T")[0],
      );
      setDateTo(now.toISOString().split("T")[0]);
    } else if (preset === "thisYear") {
      setDateFrom(
        new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0],
      );
      setDateTo(now.toISOString().split("T")[0]);
    }
  };

  return (
    <AppLayout>
      <PageMeta
        title="Analisis Periode | MyFinance"
        description="Laporan gabungan semua sumber per periode"
      />
      <PageBreadcrumb pageTitle="Analisis Periode" />

      {/* Filter bar */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-4 mb-6">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pilih Periode & Sumber</span>
          {/* Quick presets */}
          <div className="hidden sm:flex gap-2">
            {[
              ["thisMonth", "Bulan Ini"],
              ["lastMonth", "Bulan Lalu"],
              ["last3", "3 Bulan"],
              ["thisYear", "Tahun Ini"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setPreset(k)}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Dari Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          {/* Sampai Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          {/* Sumber */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sumber</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="ALL">Bank + Dompet</option>
              <option value="BANK">Bank saja</option>
              <option value="WALLET">Dompet saja</option>
            </select>
          </div>
          {/* Tombol Analisis */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-transparent select-none">Aksi</label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="h-9 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-5 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              Analisis
            </button>
          </div>
        </div>

        {/* Quick presets mobile */}
        <div className="flex sm:hidden flex-wrap gap-2 mt-3">
          {[
            ["thisMonth", "Bulan Ini"],
            ["lastMonth", "Bulan Lalu"],
            ["last3", "3 Bulan Terakhir"],
            ["thisYear", "Tahun Ini"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setPreset(k)}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!hasData && !loading && (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            className="text-gray-300 dark:text-gray-600 mb-3"
          >
            <path
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Pilih periode dan klik Analisis untuk melihat laporan gabungan
          </p>
        </div>
      )}

      {hasData && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
              <p className="text-xs text-success-600 dark:text-success-400 mb-1">
                Total Pemasukan
              </p>
              <p className="text-xl font-bold text-success-700 dark:text-success-400">
                +{formatIDR(summary.totalCredit)}
              </p>
            </div>
            <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
              <p className="text-xs text-error-600 dark:text-error-400 mb-1">
                Total Pengeluaran
              </p>
              <p className="text-xl font-bold text-error-700 dark:text-error-400">
                -{formatIDR(summary.totalDebit)}
              </p>
            </div>
            <div
              className={`rounded-2xl border p-4 ${summary.netFlow >= 0 ? "border-brand-200 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10" : "border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10"}`}
            >
              <p
                className={`text-xs mb-1 ${summary.netFlow >= 0 ? "text-brand-600 dark:text-brand-400" : "text-error-600 dark:text-error-400"}`}
              >
                Net Flow
              </p>
              <p
                className={`text-xl font-bold ${summary.netFlow >= 0 ? "text-brand-700 dark:text-brand-400" : "text-error-700 dark:text-error-400"}`}
              >
                {summary.netFlow >= 0 ? "+" : ""}
                {formatIDR(summary.netFlow)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Total Transaksi
              </p>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                {summary.transactionCount.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Bank: {summary.bankCount} · Dompet: {summary.walletCount}
              </p>
            </div>
          </div>

          {/* Daily cashflow chart */}
          {daily.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">
                Cash Flow Harian — Gabungan Semua Sumber
              </h3>
              <PeriodCashFlowChart data={daily} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Per-source breakdown */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">
                Rincian per Rekening / Dompet
              </h3>
              <div className="space-y-3">
                {bySource.map((s, i) => {
                  const total = s.credit + s.debit;
                  const grandTotal = summary.totalCredit + summary.totalDebit;
                  const pctOfTotal =
                    grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${s.source === "BANK" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"}`}
                          >
                            {s.source}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {s.provider} · {s.accountName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {s.count}x
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs mb-1">
                        <span className="text-success-600 dark:text-success-400">
                          +{formatIDR(s.credit)}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span className="text-error-600 dark:text-error-400">
                          -{formatIDR(s.debit)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${pctOfTotal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-category donut */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">
                Pengeluaran per Kategori
              </h3>
              {byCategory.filter((c) => c.debit > 0).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  Tidak ada data pengeluaran
                </p>
              ) : (
                <PeriodDonutChart
                  labels={byCategory.filter((c) => c.debit > 0).slice(0, 8).map((c) => c.name)}
                  series={byCategory.filter((c) => c.debit > 0).slice(0, 8).map((c) => c.debit)}
                />
              )}
            </div>
          </div>

          {/* Category table */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Rincian per Kategori
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {[
                      "Kategori",
                      "Transaksi",
                      "Pemasukan",
                      "Pengeluaran",
                      "Net",
                    ].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {byCategory.map((cat, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {cat.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {cat.count}x
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm font-medium text-success-600 dark:text-success-400">
                        {cat.credit > 0 ? `+${formatIDR(cat.credit)}` : "—"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm font-medium text-error-600 dark:text-error-400">
                        {cat.debit > 0 ? `-${formatIDR(cat.debit)}` : "—"}
                      </TableCell>
                      <TableCell
                        className={`py-3 px-4 text-sm font-semibold ${cat.credit - cat.debit >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}
                      >
                        {cat.credit - cat.debit >= 0 ? "+" : ""}
                        {formatIDR(cat.credit - cat.debit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Transaction list */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Semua Transaksi ({filteredTx.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari</label>
                  <div className="relative">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Cari keterangan..."
                      value={txSearch}
                      onChange={(e) => { setTxSearch(e.target.value); setTxPage(1); }}
                      className="h-8 w-full pl-7 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipe</label>
                  <select
                    value={txFilter}
                    onChange={(e) => { setTxFilter(e.target.value as "ALL" | "CREDIT" | "DEBIT"); setTxPage(1); }}
                    className="h-8 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="ALL">Semua</option>
                    <option value="CREDIT">Masuk</option>
                    <option value="DEBIT">Keluar</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {[
                      "Tanggal",
                      "Keterangan",
                      "Sumber",
                      "Kategori",
                      "Jumlah",
                      "Saldo",
                    ].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-sm text-gray-400"
                        colSpan={6}
                      >
                        Tidak ada transaksi
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedTx.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {tx.date}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90 max-w-[200px] truncate">
                            {tx.description}
                          </p>
                          {tx.reference && (
                            <p className="text-xs text-gray-400">
                              {tx.reference}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tx.source === "BANK" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"}`}
                            >
                              {tx.source}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {tx.provider}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {tx.accountName}
                          </p>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {tx.category}
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}
                          >
                            {tx.type === "CREDIT" ? "+" : "-"}
                            {formatIDR(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {tx.balance != null ? formatIDR(tx.balance) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={txPage}
              totalPages={txTotalPages}
              total={filteredTx.length}
              limit={txLimit}
              onPageChange={setTxPage}
              onLimitChange={(l) => {
                setTxLimit(l);
                setTxPage(1);
              }}
            />
          </div>
        </>
      )}
    </AppLayout>
  );
}
