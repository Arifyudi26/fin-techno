import { useState, useEffect, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@components/ui/table";
import Pagination from "@components/ui/pagination/Pagination";
import axiosGlobal from "@/services/AxiosGlobal";
import { fmtDate } from "@/lib/utils";

const formatIDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

interface Tx {
  id: string;
  source: "BANK" | "WALLET";
  date: string;
  description: string;
  reference: string | null;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance: number | null;
  category: string;
  accountName: string;
  provider: string;
  status: string;
}

interface Summary { totalCredit: number; totalDebit: number; netFlow: number; }

export default function Transactions() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCredit: 0, totalDebit: 0, netFlow: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    type: "ALL", source: "ALL", search: "", dateFrom: "", dateTo: "", page: 1, limit: 10,
  });

  const fetchTx = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type !== "ALL") params.set("type", filters.type);
      if (filters.source !== "ALL") params.set("source", filters.source);
      if (filters.search) params.set("search", filters.search);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      params.set("page", String(filters.page));
      params.set("limit", String(filters.limit));

      const res = await axiosGlobal.get(`/transactions?${params}`);
      setTransactions(res.data.transactions);
      setSummary(res.data.summary);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  const setFilter = (key: string, value: string | number) =>
    setFilters((p) => ({ ...p, [key]: value, page: key !== "page" ? 1 : (value as number) }));

  return (
    <AppLayout>
      <PageMeta title="Semua Transaksi | MyFinance" description="Daftar semua transaksi dari seluruh rekening" />
      <PageBreadcrumb pageTitle="Semua Transaksi" />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success-100 dark:bg-success-500/20 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-success-600"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <p className="text-xs text-success-600 dark:text-success-400">Total Masuk</p>
            <p className="text-base font-bold text-success-700 dark:text-success-400">+{formatIDR(summary.totalCredit)}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-error-100 dark:bg-error-500/20 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-error-600"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <p className="text-xs text-error-600 dark:text-error-400">Total Keluar</p>
            <p className="text-base font-bold text-error-700 dark:text-error-400">-{formatIDR(summary.totalDebit)}</p>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${summary.netFlow >= 0 ? "border-brand-200 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10" : "border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10"}`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${summary.netFlow >= 0 ? "bg-brand-100 dark:bg-brand-500/20" : "bg-error-100 dark:bg-error-500/20"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={summary.netFlow >= 0 ? "text-brand-600" : "text-error-600"}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <p className={`text-xs ${summary.netFlow >= 0 ? "text-brand-600 dark:text-brand-400" : "text-error-600 dark:text-error-400"}`}>Net Flow</p>
            <p className={`text-base font-bold ${summary.netFlow >= 0 ? "text-brand-700 dark:text-brand-400" : "text-error-700 dark:text-error-400"}`}>
              {summary.netFlow >= 0 ? "+" : ""}{formatIDR(summary.netFlow)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03] mb-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter</span>
          {(filters.type !== "ALL" || filters.source !== "ALL" || filters.search || filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => setFilters((p) => ({ ...p, type: "ALL", source: "ALL", search: "", dateFrom: "", dateTo: "", page: 1 }))}
              className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
            >
              Reset Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Cari */}
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-3 lg:col-span-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari</label>
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Cari keterangan..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                className="h-9 w-full pl-8 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
          {/* Tipe */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipe</label>
            <select value={filters.type} onChange={(e) => setFilter("type", e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              <option value="ALL">Semua Tipe</option>
              <option value="CREDIT">Pemasukan</option>
              <option value="DEBIT">Pengeluaran</option>
            </select>
          </div>
          {/* Sumber */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sumber</label>
            <select value={filters.source} onChange={(e) => setFilter("source", e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              <option value="ALL">Bank & Dompet</option>
              <option value="BANK">Bank</option>
              <option value="WALLET">Dompet Digital</option>
            </select>
          </div>
          {/* Dari Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Dari Tanggal</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {/* Sampai Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} transaksi ditemukan</p>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  {["Tanggal", "Keterangan", "Akun", "Kategori", "Jumlah", "Saldo", "Status"].map((h) => (
                    <TableCell key={h} isHeader className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-12 text-center text-sm text-gray-400" colSpan={7}>Tidak ada transaksi</TableCell>
                  </TableRow>
                ) : transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(tx.date)}</TableCell>
                    <TableCell className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90 max-w-[200px] truncate">{tx.description}</p>
                      {tx.reference && <p className="text-xs text-gray-400">{tx.reference}</p>}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <p className="text-xs text-gray-700 dark:text-gray-300">{tx.accountName}</p>
                      <p className="text-xs text-gray-400">{tx.provider} · {tx.source}</p>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{tx.category}</TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}{formatIDR(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {tx.balance != null ? formatIDR(tx.balance) : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>
                        {tx.status === "VERIFIED" ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={filters.page}
          totalPages={totalPages}
          total={total}
          limit={filters.limit}
          onPageChange={(p) => setFilter("page", p)}
          onLimitChange={(l) => setFilter("limit", l)}
        />
      </div>
    </AppLayout>
  );
}
