import { useEffect, useState, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@components/ui/table";
import Pagination from "@components/ui/pagination/Pagination";
import axiosGlobal from "@/services/AxiosGlobal";

const formatIDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

interface Tx { id: string; date: string; description: string; type: string; amount: number; category: string; accountName: string; provider: string; status: string; }

export default function ExpensePage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, netFlow: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "DEBIT", page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await axiosGlobal.get(`/transactions?${params}`);
      setTransactions(res.data.transactions);
      setSummary(res.data.summary);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch { setTransactions([]); }
    finally { setLoading(false); }
  }, [search, dateFrom, dateTo, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AppLayout>
      <PageMeta title="Pengeluaran | MyFinance" description="Daftar transaksi pengeluaran" />
      <PageBreadcrumb pageTitle="Pengeluaran" />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
          <p className="text-xs text-error-600 dark:text-error-400 mb-1">Total Pengeluaran</p>
          <p className="text-xl font-bold text-error-700 dark:text-error-400">-{formatIDR(summary.totalDebit)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jumlah Transaksi</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white/90">{total}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Cari keterangan..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none" />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  {["Tanggal", "Keterangan", "Akun", "Kategori", "Jumlah", "Status"].map((h) => (
                    <TableCell key={h} isHeader className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">{h}</TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.length === 0 ? (
                  <TableRow><TableCell className="py-12 text-center text-sm text-gray-400" colSpan={6}>Tidak ada pengeluaran</TableCell></TableRow>
                ) : transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{tx.date}</TableCell>
                    <TableCell className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-white/90 max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{tx.accountName}</TableCell>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{tx.category}</TableCell>
                    <TableCell className="py-3 px-4 text-sm font-semibold text-error-600 dark:text-error-400 whitespace-nowrap">-{formatIDR(tx.amount)}</TableCell>
                    <TableCell className="py-3 px-4"><Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>{tx.status === "VERIFIED" ? "Verified" : "Pending"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>
    </AppLayout>
  );
}
