import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { useI18n } from "@lib/i18n";


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
  // transactions no longer pre-loaded — fetched lazily via /api/calendar/[date]
}


const idrFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const timeFmt = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const fmt = (v: number) => idrFmt.format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
};

const fmtDateIndo = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const fmtTime = (isoStr: string) => timeFmt.format(new Date(isoStr));

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


const DOT_WRAP: React.CSSProperties = { display: "flex", gap: 3, padding: "2px 4px 4px" };
const DOT_GREEN: React.CSSProperties = {
  display: "block", width: 7, height: 7, borderRadius: "50%",
  background: "#16a34a", flexShrink: 0,
};
const DOT_RED: React.CSSProperties = {
  display: "block", width: 7, height: 7, borderRadius: "50%",
  background: "#dc2626", flexShrink: 0,
};
const AMT_WRAP: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 2, padding: "2px 4px 4px",
};
const AMT_GREEN: React.CSSProperties = {
  fontSize: 10, lineHeight: 1.3, fontWeight: 500, color: "#16a34a",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};
const AMT_RED: React.CSSProperties = {
  fontSize: 10, lineHeight: 1.3, fontWeight: 500, color: "#dc2626",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};


export default function Calendar() {
  const { t, lang } = useI18n();
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryMapRef = useRef<Record<string, DaySummary>>({});

  // Debounced isMobile — avoids re-render storm on resize
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(check, 150); };
    window.addEventListener("resize", debounced);
    return () => { window.removeEventListener("resize", debounced); clearTimeout(timer); };
  }, []);

  const { isOpen: isDayOpen, openModal: openDay, closeModal: closeDay } = useModal();
  const [selectedDate, setSelectedDate] = useState("");
  const [dayTxs, setDayTxs] = useState<TxDetail[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  const { isOpen: isTxOpen, openModal: openTxDetail, closeModal: closeTxDetail } = useModal();
  const [selectedTx, setSelectedTx] = useState<TxDetail | null>(null);

  // summaryMap derived from state — memoized so dayCellContent doesn't get a new object ref each render
  const summaryMap = useMemo(
    () => Object.fromEntries(daySummaries.map((s) => [s.date, s])),
    [daySummaries],
  );

  const fetchSummaries = useCallback(async (from: string, to: string) => {
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
  }, []);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      fetchSummaries(arg.startStr.split("T")[0], arg.endStr.split("T")[0]);
    },
    [fetchSummaries],
  );

  // Lazy-load transactions for a specific day when user clicks
  const openDayModal = useCallback(async (dateStr: string) => {
    const summary = summaryMapRef.current[dateStr];
    if (!summary) return;
    setSelectedDate(dateStr);
    setDayTxs([]);
    openDay();
    setDayLoading(true);
    try {
      const res = await axiosGlobal.get(`/calendar/${dateStr}`);
      setDayTxs(res.data);
    } catch {
      setDayTxs([]);
    } finally {
      setDayLoading(false);
    }
  }, [openDay]);

  const handleDateClick = useCallback(
    (info: { dateStr: string }) => openDayModal(info.dateStr.split("T")[0]),
    [openDayModal],
  );

  const handleTxClick = useCallback((tx: TxDetail) => {
    setSelectedTx(tx);
    openTxDetail();
  }, [openTxDetail]);

  // Stable dayCellContent — only re-created when summaryMap or isMobile changes
  const dayCellContent = useCallback(
    (arg: { date: Date; dayNumberText: string }) => {
      const dateStr = toLocalDateStr(arg.date);
      const s = summaryMap[dateStr];
      const hasData = !!s;
      const hasCredit = hasData && s.totalCredit > 0;
      const hasDebit = hasData && s.totalDebit > 0;

      return (
        <div className={`fc-daygrid-day-top w-full ${hasData ? "cursor-pointer" : "cursor-default"}`}>
          <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>
          {hasData && (
            isMobile ? (
              <div style={DOT_WRAP}>
                {hasCredit && <span style={DOT_GREEN} />}
                {hasDebit && <span style={DOT_RED} />}
              </div>
            ) : (
              <div style={AMT_WRAP}>
                {hasCredit && <span style={AMT_GREEN}>+{fmtShort(s.totalCredit)}</span>}
                {hasDebit && <span style={AMT_RED}>-{fmtShort(s.totalDebit)}</span>}
              </div>
            )
          )}
        </div>
      );
    },
    [summaryMap, isMobile],
  );

  // Summary bar values — memoized to avoid recalculating on every modal render
  const dayTxSummary = useMemo(() => {
    const credit = dayTxs.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const debit = dayTxs.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    return { credit, debit };
  }, [dayTxs]);

  return (
    <AppLayout>
      <PageMeta title={`${t.calendar.title} | Fin-Techno`} description={t.calendar.description} />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <div className="custom-calendar relative p-2 sm:p-4">
          {summaryLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}
          <FullCalendar
            locale={lang === "id" ? idLocale : undefined}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            selectable={false}
            dateClick={handleDateClick}
            datesSet={handleDatesSet}
            height="auto"
            dayCellContent={dayCellContent}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.calendar.legendIncome}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.calendar.legendExpense}</span>
          </div>
        </div>
      </div>

      {/* Day Transactions Modal */}
      <Modal isOpen={isDayOpen} onClose={closeDay} className="w-full max-w-[560px] mx-3 sm:mx-auto p-4 sm:p-6">
        <div className="flex flex-col max-h-[85vh] sm:max-h-[80vh]">
          <h5 className="font-semibold text-gray-800 dark:text-white/90 text-base sm:text-lg mb-1 pr-8">
            {fmtDateIndo(selectedDate)}
          </h5>

          {dayTxs.length > 0 && (
            <div className="flex gap-2 mb-4 mt-3">
              <div className="flex-1 rounded-lg bg-success-50 dark:bg-success-500/10 px-3 py-2">
                <p className="text-xs text-success-600 dark:text-success-400 font-medium">{t.calendar.in}</p>
                <p className="text-sm font-semibold text-success-700 dark:text-success-300 truncate">
                  +{fmt(dayTxSummary.credit)}
                </p>
              </div>
              <div className="flex-1 rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2">
                <p className="text-xs text-error-600 dark:text-error-400 font-medium">{t.calendar.out}</p>
                <p className="text-sm font-semibold text-error-700 dark:text-error-300 truncate">
                  -{fmt(dayTxSummary.debit)}
                </p>
              </div>
              <div className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.calendar.txCount}</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{dayTxs.length}x</p>
              </div>
            </div>
          )}

          {dayLoading ? (
            <div className="space-y-2 mt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : dayTxs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-sm text-gray-400 dark:text-gray-500">
              <span className="text-3xl mb-2">📭</span>
              {t.calendar.noTransactions}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-1.5 no-scrollbar">
              {dayTxs.map((tx) => (
                <TxListItem key={tx.id} tx={tx} onClick={handleTxClick} />
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal isOpen={isTxOpen} onClose={closeTxDetail} className="w-full max-w-[480px] mx-3 sm:mx-auto p-4 sm:p-6">
        {selectedTx && <TxDetail tx={selectedTx} />}
      </Modal>
    </AppLayout>
  );
}


const TxArrow = ({ type }: { type: "CREDIT" | "DEBIT" }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    className={type === "CREDIT" ? "text-success-600" : "text-error-600"}>
    {type === "CREDIT" ? (
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const TxListItem = ({ tx, onClick }: { tx: TxDetail; onClick: (tx: TxDetail) => void }) => (
  <button
    onClick={() => onClick(tx)}
    className="w-full flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] active:bg-gray-100 dark:active:bg-white/[0.05] transition-colors text-left"
  >
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        tx.type === "CREDIT" ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"
      }`}>
        <TxArrow type={tx.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{tx.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{fmtTime(tx.datetime)} · {tx.provider}</p>
      </div>
    </div>
    <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
      <span className={`text-sm font-semibold whitespace-nowrap ${
        tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-500 dark:text-error-400"
      }`}>
        {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
      </span>
      <Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>
        {tx.status === "VERIFIED" ? "Verified" : "Pending"}
      </Badge>
    </div>
  </button>
);

const TxDetailArrow = ({ type }: { type: "CREDIT" | "DEBIT" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    className={type === "CREDIT" ? "text-success-600" : "text-error-600"}>
    {type === "CREDIT" ? (
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const TxDetail = ({ tx }: { tx: TxDetail }) => (
  <div>
    <div className="flex items-center gap-3 mb-5 pr-8">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
        tx.type === "CREDIT" ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"
      }`}>
        <TxDetailArrow type={tx.type} />
      </div>
      <div>
        <p className={`text-xl font-bold ${
          tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"
        }`}>
          {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {tx.type === "CREDIT" ? "Pemasukan" : "Pengeluaran"}
        </p>
      </div>
    </div>

    <div className="space-y-2.5">
      <DetailRow label="Keterangan" value={tx.description} />
      <DetailRow label="Tanggal" value={fmtDateIndo(tx.datetime.split("T")[0])} />
      <DetailRow label="Jam" value={fmtTime(tx.datetime)} />
      <DetailRow label="Rekening" value={`${tx.accountName} (${tx.provider})`} />
      <DetailRow label="Sumber" value={tx.source === "WALLET" ? "Dompet Digital" : "Bank"} />
      {tx.categories.length > 0 && (
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-0.5">Kategori</span>
          <div className="flex flex-wrap gap-1 justify-end">
            {tx.categories.map((c, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {tx.reference && <DetailRow label="Referensi" value={tx.reference} mono />}
      {tx.balance != null && <DetailRow label="Saldo Akhir" value={fmt(tx.balance)} />}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
        <Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>
          {tx.status === "VERIFIED" ? "Verified" : "Pending"}
        </Badge>
      </div>
    </div>
  </div>
);

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-0.5 min-w-[72px]">
        {label}
      </span>
      <span className={`text-sm text-gray-800 dark:text-white/90 text-right break-words min-w-0 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
