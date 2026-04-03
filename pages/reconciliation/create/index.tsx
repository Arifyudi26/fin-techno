import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

interface Transaction {
  id: string;
  date: string;
  description: string;
  bank: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  isDuplicate?: boolean;
}

const initialAvailable: Transaction[] = [
  { id: "tx-1", date: "2025-04-28", description: "Transfer Masuk - PT Maju Jaya", bank: "BCA", amount: 15_000_000, type: "CREDIT" },
  { id: "tx-2", date: "2025-04-27", description: "Pembayaran Listrik PLN", bank: "BRI", amount: 1_250_000, type: "DEBIT" },
  { id: "tx-3", date: "2025-04-26", description: "Gaji Karyawan April", bank: "Mandiri", amount: 8_200_000, type: "DEBIT" },
  { id: "tx-4", date: "2025-04-25", description: "Penjualan Produk Online", bank: "BCA", amount: 4_500_000, type: "CREDIT" },
  { id: "tx-5", date: "2025-04-24", description: "Pembelian Bahan Baku", bank: "BNI", amount: 3_800_000, type: "DEBIT" },
  { id: "tx-6", date: "2025-04-23", description: "Transfer Masuk - CV Sejahtera", bank: "BRI", amount: 7_200_000, type: "CREDIT" },
  { id: "tx-7", date: "2025-04-22", description: "Biaya Sewa Kantor", bank: "Mandiri", amount: 5_000_000, type: "DEBIT" },
  { id: "tx-8", date: "2025-04-21", description: "Penjualan Jasa Konsultasi", bank: "BCA", amount: 12_000_000, type: "CREDIT" },
];

export default function CreateReconciliation() {
  const [available, setAvailable] = useState<Transaction[]>(initialAvailable);
  const [merged, setMerged] = useState<Transaction[]>([]);
  const [reportName, setReportName] = useState("Rekonsiliasi April 2025");
  const [filterBank, setFilterBank] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const totalCredit = merged.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalDebit = merged.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const netFlow = totalCredit - totalDebit;

  const filteredAvailable = available.filter((t) => {
    const bankMatch = filterBank === "ALL" || t.bank === filterBank;
    const typeMatch = filterType === "ALL" || t.type === filterType;
    return bankMatch && typeMatch;
  });

  const banks = ["ALL", ...Array.from(new Set(initialAvailable.map((t) => t.bank)))];

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // available → merged
    if (source.droppableId === "available" && destination.droppableId === "merged") {
      const srcList = [...filteredAvailable];
      const item = srcList[source.index];
      // check duplicate (same amount + date already in merged)
      const isDuplicate = merged.some(
        (t) => t.amount === item.amount && t.date === item.date && t.type === item.type
      );
      setAvailable((prev) => prev.filter((t) => t.id !== item.id));
      setMerged((prev) => {
        const newList = [...prev];
        newList.splice(destination.index, 0, { ...item, isDuplicate });
        return newList;
      });
    }

    // merged → available (remove from report)
    if (source.droppableId === "merged" && destination.droppableId === "available") {
      const item = merged[source.index];
      setMerged((prev) => prev.filter((t) => t.id !== item.id));
      setAvailable((prev) => {
        const newList = [...prev];
        newList.splice(destination.index, 0, { ...item, isDuplicate: false });
        return newList;
      });
    }

    // reorder within merged
    if (source.droppableId === "merged" && destination.droppableId === "merged") {
      const newList = [...merged];
      const [moved] = newList.splice(source.index, 1);
      newList.splice(destination.index, 0, moved);
      setMerged(newList);
    }
  };

  const removeFromMerged = (id: string) => {
    const item = merged.find((t) => t.id === id);
    if (!item) return;
    setMerged((prev) => prev.filter((t) => t.id !== id));
    setAvailable((prev) => [...prev, { ...item, isDuplicate: false }]);
  };

  const addAll = () => {
    const toAdd = filteredAvailable.map((item) => ({
      ...item,
      isDuplicate: merged.some(
        (t) => t.amount === item.amount && t.date === item.date && t.type === item.type
      ),
    }));
    setMerged((prev) => [...prev, ...toAdd]);
    setAvailable((prev) => prev.filter((t) => !filteredAvailable.find((f) => f.id === t.id)));
  };

  const clearMerged = () => {
    setAvailable((prev) => [...prev, ...merged.map((t) => ({ ...t, isDuplicate: false }))]);
    setMerged([]);
  };

  return (
    <AppLayout>
      <PageMeta title="Buat Laporan Rekonsiliasi | MyFinance" description="Drag transaksi ke laporan merge" />
      <PageBreadcrumb pageTitle="Buat Laporan Rekonsiliasi" />

      {/* Report name */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          className="h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-gray-800 dark:text-white/90 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/20 w-full sm:max-w-xs"
          placeholder="Nama laporan..."
        />
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50" disabled={merged.length === 0}>
          Simpan Laporan
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* ── LEFT: Available transactions ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white/90">Transaksi Tersedia</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{available.length} transaksi · drag ke kanan untuk menambahkan</p>
              </div>
              <button onClick={addAll} disabled={filteredAvailable.length === 0} className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40">
                Tambah Semua →
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                {banks.map((b) => <option key={b} value={b}>{b === "ALL" ? "Semua Bank" : b}</option>)}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="CREDIT">Pemasukan</option>
                <option value="DEBIT">Pengeluaran</option>
              </select>
            </div>

            <Droppable droppableId="available">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] rounded-2xl border-2 border-dashed p-3 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/5"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.02]"
                  }`}
                >
                  {filteredAvailable.length === 0 && (
                    <div className="flex h-full min-h-[360px] items-center justify-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada transaksi tersedia</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {filteredAvailable.map((tx, index) => (
                      <Draggable key={tx.id} draggableId={tx.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`flex items-center gap-3 rounded-xl border bg-white dark:bg-gray-900 px-3 py-2.5 select-none transition-shadow ${
                              snap.isDragging
                                ? "shadow-theme-lg border-brand-300 dark:border-brand-500/50 rotate-1"
                                : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                            }`}
                          >
                            {/* drag handle */}
                            <svg className="shrink-0 text-gray-300 dark:text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 dark:text-white/90 truncate">{tx.description}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{tx.date} · {tx.bank}</p>
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                              {tx.type === "CREDIT" ? "+" : "-"}{formatIDR(tx.amount)}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* ── RIGHT: Merge report ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white/90">Laporan Merge</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{merged.length} transaksi dipilih</p>
              </div>
              {merged.length > 0 && (
                <button onClick={clearMerged} className="text-xs font-medium text-error-500 hover:text-error-600">
                  ← Hapus Semua
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-success-50 dark:bg-success-500/10 px-3 py-2.5">
                <p className="text-xs text-success-600 dark:text-success-400 mb-0.5">Masuk</p>
                <p className="text-sm font-bold text-success-700 dark:text-success-300">{(totalCredit / 1_000_000).toFixed(1)}jt</p>
              </div>
              <div className="rounded-xl bg-error-50 dark:bg-error-500/10 px-3 py-2.5">
                <p className="text-xs text-error-600 dark:text-error-400 mb-0.5">Keluar</p>
                <p className="text-sm font-bold text-error-700 dark:text-error-300">{(totalDebit / 1_000_000).toFixed(1)}jt</p>
              </div>
              <div className={`rounded-xl px-3 py-2.5 ${netFlow >= 0 ? "bg-brand-50 dark:bg-brand-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
                <p className={`text-xs mb-0.5 ${netFlow >= 0 ? "text-brand-600 dark:text-brand-400" : "text-error-600 dark:text-error-400"}`}>Net</p>
                <p className={`text-sm font-bold ${netFlow >= 0 ? "text-brand-700 dark:text-brand-300" : "text-error-700 dark:text-error-300"}`}>
                  {netFlow >= 0 ? "+" : ""}{(netFlow / 1_000_000).toFixed(1)}jt
                </p>
              </div>
            </div>

            <Droppable droppableId="merged">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] rounded-2xl border-2 p-3 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-success-400 bg-success-50 dark:border-success-500/50 dark:bg-success-500/5"
                      : merged.length === 0
                        ? "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.02]"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]"
                  }`}
                >
                  {merged.length === 0 && (
                    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2">
                      <svg className="text-gray-300 dark:text-gray-600" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center">Drag transaksi ke sini<br />untuk menambahkan ke laporan</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {merged.map((tx, index) => (
                      <Draggable key={tx.id} draggableId={tx.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 select-none transition-shadow ${
                              snap.isDragging
                                ? "shadow-theme-lg border-brand-300 dark:border-brand-500/50 bg-white dark:bg-gray-900 rotate-1"
                                : tx.isDuplicate
                                  ? "border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/5"
                                  : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200"
                            }`}
                          >
                            <svg className="shrink-0 text-gray-300 dark:text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium text-gray-800 dark:text-white/90 truncate">{tx.description}</p>
                                {tx.isDuplicate && (
                                  <Badge size="sm" color="warning">Duplikat</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{tx.date} · {tx.bank}</p>
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                              {tx.type === "CREDIT" ? "+" : "-"}{formatIDR(tx.amount)}
                            </span>
                            <button
                              onClick={() => removeFromMerged(tx.id)}
                              className="shrink-0 text-gray-300 hover:text-error-500 dark:text-gray-600 dark:hover:text-error-400 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </AppLayout>
  );
}
