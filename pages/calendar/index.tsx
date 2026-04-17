import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { DatesSetArg } from "@fullcalendar/core";
import idLocale from "@fullcalendar/core/locales/id";
import AppLayout from "@components/layout/AppLayout";
import { Modal } from "@components/ui/modal";
import { useModal } from "@lib/hooks/useModal";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";
import axiosGlobal from "@/services/AxiosGlobal";

interface TxDetail {
  id: string;
  datetime: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  description: string;
  reference: string | null;
  balance: number | null;
  status: string;
  provider: string;
  accountName: string;
  source: "BANK" | "WALLET";
  categories: { name: string }[];
}

interface DaySummary {
  date: string;
  totalCredit: number;
  totalDebit: number;
  count: number;
  transactions: TxDetail[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const fmtDateIndo = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

const fmtTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Calendar() {
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryMapRef = useRef<Record<string, DaySummary>>({});

  // Day list modal
  const { isOpen: isDayOpen, openModal: openDay, closeModal: closeDay } = useModal();
  const [selectedDate, setSelectedDate] = useState("");
  const [dayTxs, setDayTxs] = useState<TxDetail[]>([]);

  // Transaction detail modal
  const { isOpen: isTxOpen, openModal: openTxDetail, closeModal: closeTxDetail } = useModal();
  const [selectedTx, setSelectedTx] = useState<TxDetail | null>(null);

  const fetchSummaries = async (from: string, to: string) => {
    setSummaryLoading(true);
    try {
      const res = await axiosGlobal.get(`/calendar?dateFrom=${from}&dateTo=${to}`);
      const data: DaySummary[] = res.data;
      setDaySummaries(data);
      summaryMapRef.current = Object.fromEntries(data.map((s) => [s.date, s]));
    } catch {
      setDaySummaries([]);
      summaryMapRef.current = {};
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const from = arg.startStr.split("T")[0];
    const to = arg.endStr.split("T")[0];
    fetchSummaries(from, to);
  };

  const openDayModal = (dateStr: string) => {
    const summary = summaryMapRef.current[dateStr];
    if (!summary) return;
    setSelectedDate(dateStr);
    setDayTxs(summary.transactions.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    openDay();
  };

  const handleTxClick = (tx: TxDetail) => {
    setSelectedTx(tx);
    openTxDetail();
  };

  const summaryMap = Object.fromEntries(daySummaries.map((s) => [s.date, s]));

  return (
    <AppLayout>
      <PageMeta title="Kalender Transaksi" description="Kalender ringkasan transaksi harian" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar relative">
          {summaryLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}
          <FullCalendar
            locale={idLocale}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            selectable={false}
            dateClick={(info) => openDayModal(info.dateStr.split("T")[0])}
            datesSet={handleDatesSet}
            dayCellContent={(arg) => {
              const dateStr = toLocalDateStr(arg.date);
              const s = summaryMap[dateStr];
              return (
                <div className={`fc-daygrid-day-top w-full ${s ? "cursor-pointer" : "cursor-default"}`}>
                  <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>
                  {s && (
                    <div className="flex flex-col gap-0.5 mt-0.5 px-1 pb-1">
                      {s.totalCredit > 0 && (
                        <span className="text-[10px] leading-tight font-medium text-success-600 dark:text-success-400 truncate">
                          +{fmt(s.totalCredit)}
                        </span>
                      )}
                      {s.totalDebit > 0 && (
                        <span className="text-[10px] leading-tight font-medium text-error-500 dark:text-error-400 truncate">
                          -{fmt(s.totalDebit)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          />
        </div>

        {/* Day Transactions Modal */}
        <Modal isOpen={isDayOpen} onClose={closeDay} className="max-w-[560px] p-6">
          <div className="flex flex-col max-h-[80vh]">
            <h5 className="font-semibold text-gray-800 dark:text-white/90 text-lg mb-1">
              {fmtDateIndo(selectedDate)}
            </h5>
            {dayTxs.length > 0 && (() => {
              const credit = dayTxs.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
              const debit = dayTxs.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
              return (
                <div className="flex gap-3 mb-4 mt-3">
                  <div className="flex-1 rounded-lg bg-success-50 dark:bg-success-500/10 px-3 py-2">
                    <p className="text-xs text-success-600 dark:text-success-400 font-medium">Pemasukan</p>
                    <p className="text-sm font-semibold text-success-700 dark:text-success-300">+{fmt(credit)}</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2">
                    <p className="text-xs text-error-600 dark:text-error-400 font-medium">Pengeluaran</p>
                    <p className="text-sm font-semibold text-error-700 dark:text-error-300">-{fmt(debit)}</p>
                  </div>
                </div>
              );
            })()}
            {dayTxs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-sm text-gray-400 dark:text-gray-500">
                <span className="text-3xl mb-2">📭</span>
                Tidak ada transaksi di tanggal ini
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {dayTxs.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => handleTxClick(tx)}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === "CREDIT" ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={tx.type === "CREDIT" ? "text-success-600" : "text-error-600"}>
                          {tx.type === "CREDIT"
                            ? <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            : <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          }
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{fmtTime(tx.datetime)} · {tx.provider}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ml-3 ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-500 dark:text-error-400"}`}>
                      {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>

        {/* Transaction Detail Modal */}
        <Modal isOpen={isTxOpen} onClose={closeTxDetail} className="max-w-[480px] p-6">
          {selectedTx && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${selectedTx.type === "CREDIT" ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={selectedTx.type === "CREDIT" ? "text-success-600" : "text-error-600"}>
                    {selectedTx.type === "CREDIT"
                      ? <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      : <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    }
                  </svg>
                </div>
                <div>
                  <p className={`text-xl font-bold ${selectedTx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                    {selectedTx.type === "CREDIT" ? "+" : "-"}{fmt(selectedTx.amount)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{selectedTx.type === "CREDIT" ? "Pemasukan" : "Pengeluaran"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <DetailRow label="Keterangan" value={selectedTx.description} />
                <DetailRow label="Tanggal" value={fmtDateIndo(selectedTx.datetime.split("T")[0])} />
                <DetailRow label="Jam" value={fmtTime(selectedTx.datetime)} />
                <DetailRow label="Rekening" value={`${selectedTx.accountName} (${selectedTx.provider})`} />
                <DetailRow label="Sumber" value={selectedTx.source === "WALLET" ? "Dompet Digital" : "Bank"} />
                {selectedTx.categories.length > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-0.5">Kategori</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedTx.categories.map((c, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTx.reference && <DetailRow label="Referensi" value={selectedTx.reference} mono />}
                {selectedTx.balance != null && <DetailRow label="Saldo Akhir" value={fmt(selectedTx.balance)} />}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
                  <Badge size="sm" color={selectedTx.status === "VERIFIED" ? "success" : "warning"}>
                    {selectedTx.status === "VERIFIED" ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 dark:text-white/90 text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
