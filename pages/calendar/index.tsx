import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg, DatesSetArg } from "@fullcalendar/core";
import idLocale from "@fullcalendar/core/locales/id";
import AppLayout from "@components/layout/AppLayout";
import { Modal } from "@components/ui/modal";
import { useModal } from "@lib/hooks/useModal";
import PageMeta from "@components/common/PageMeta";
import axiosGlobal from "@/services/AxiosGlobal";

interface CalendarEvent extends EventInput {
  extendedProps: { calendar: string };
}

interface TxEvent extends EventInput {
  extendedProps: { isTx: true; type: "CREDIT" | "DEBIT"; amount: number; description: string; category: string; provider: string };
}

interface DaySummary {
  date: string;
  totalCredit: number;
  totalDebit: number;
  count: number;
  transactions: { id: string; datetime: string; type: string; amount: number; description: string }[];
}

interface Tx {
  id: string;
  date: string;
  description: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  category: string;
  provider: string;
}

const calendarsEvents = { Danger: "danger", Success: "success", Primary: "primary", Warning: "warning" };

const fmtDateIndo = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


export default function Calendar() {
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);
  const [txEvents, setTxEvents] = useState<TxEvent[]>([]);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  // Add event modal
  const { isOpen: isAddOpen, openModal: openAdd, closeModal: closeAdd } = useModal();
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Transaction detail modal
  const { isOpen: isTxOpen, openModal: openTx, closeModal: closeTx } = useModal();
  const [selectedDate, setSelectedDate] = useState("");
  const [dayTxs, setDayTxs] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const summaryMap = Object.fromEntries(daySummaries.map((s) => [s.date, s]));
  const summaryMapRef = useRef(summaryMap);
  summaryMapRef.current = summaryMap;

  const fetchSummaries = async (from: string, to: string) => {
    setSummaryLoading(true);
    try {
      const res = await axiosGlobal.get(`/calendar?dateFrom=${from}&dateTo=${to}`);
      const data: DaySummary[] = res.data;
      setDaySummaries(data);

      // Build tx events untuk timeGrid (week/day) — posisi di slot waktu
      const newTxEvents: TxEvent[] = [];
      data.forEach((day) => {
        day.transactions.forEach((t) => {
          newTxEvents.push({
            id: `tx-${t.id}`,
            title: `${t.type === "CREDIT" ? "+" : "-"}${fmt(t.amount)}`,
            start: t.datetime,
            end: new Date(new Date(t.datetime).getTime() + 30 * 60 * 1000).toISOString(),
            allDay: false,
            display: "block",
            backgroundColor: t.type === "CREDIT" ? "#dcfce7" : "#fee2e2",
            borderColor: t.type === "CREDIT" ? "#16a34a" : "#dc2626",
            textColor: t.type === "CREDIT" ? "#15803d" : "#b91c1c",
            extendedProps: {
              isTx: true,
              type: t.type as "CREDIT" | "DEBIT",
              amount: t.amount,
              description: t.description,
              category: "",
              provider: "",
            },
          });
        });
      });
      setTxEvents(newTxEvents);
    } catch {
      setDaySummaries([]);
      setTxEvents([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const from = arg.startStr.split("T")[0];
    const to = arg.endStr.split("T")[0];
    fetchSummaries(from, to);
  };

  const openDayTxModal = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setTxLoading(true);
    openTx();
    try {
      const res = await axiosGlobal.get(`/transactions?dateFrom=${dateStr}&dateTo=${dateStr}&limit=100`);
      setDayTxs(res.data.transactions);
    } catch {
      setDayTxs([]);
    } finally {
      setTxLoading(false);
    }
  };

  // dateClick hanya untuk month view — hanya jika ada data
  const handleDateClick = (info: { dateStr: string }) => {
    const dateStr = info.dateStr.split("T")[0];
    if (!summaryMapRef.current[dateStr]) return;
    openDayTxModal(dateStr);
  };

  // klik tx event di week/day view
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    if (event.extendedProps.isTx) {
      const dateStr = toLocalDateStr(event.start!);
      openDayTxModal(dateStr);
      return;
    }
    // manual event
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openAdd();
  };

  const resetAddFields = () => {
    setEventTitle(""); setEventStartDate(""); setEventEndDate("");
    setEventLevel(""); setSelectedEvent(null);
  };

  const handleAddOrUpdate = () => {
    if (selectedEvent) {
      setManualEvents((prev) =>
        prev.map((e) =>
          e.id === selectedEvent.id
            ? { ...e, title: eventTitle, start: eventStartDate, end: eventEndDate, extendedProps: { calendar: eventLevel } }
            : e
        )
      );
    } else {
      setManualEvents((prev) => [
        ...prev,
        { id: Date.now().toString(), title: eventTitle, start: eventStartDate, end: eventEndDate, allDay: true, extendedProps: { calendar: eventLevel } },
      ]);
    }
    closeAdd();
    resetAddFields();
  };


  return (
    <AppLayout>
      <PageMeta title="Calendar" description="Calendar with transaction overview" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar relative">
          {summaryLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}
          <FullCalendar
            ref={calendarRef}
            locale={idLocale}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={[...manualEvents, ...txEvents]}
            selectable={false}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            eventContent={(eventInfo) => {
              if (eventInfo.event.extendedProps.isTx) {
                return (
                  <div className="px-1 py-0.5 text-[11px] font-medium truncate cursor-pointer" style={{ color: eventInfo.event.textColor ?? undefined }}>
                    {eventInfo.event.title}
                    {eventInfo.event.extendedProps.description && (
                      <span className="ml-1 opacity-70 truncate">{eventInfo.event.extendedProps.description}</span>
                    )}
                  </div>
                );
              }
              const colorClass = `fc-bg-${(eventInfo.event.extendedProps.calendar ?? "primary").toLowerCase()}`;
              return (
                <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded`}>
                  <div className="fc-daygrid-event-dot"></div>
                  <div className="fc-event-time">{eventInfo.timeText}</div>
                  <div className="fc-event-title">{eventInfo.event.title}</div>
                </div>
              );
            }}
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
            dayHeaderContent={(arg) => {
              const d = arg.date;
              const dateStr = toLocalDateStr(d);
              const s = summaryMapRef.current[dateStr];
              const isTimeGrid = arg.view.type === "timeGridWeek" || arg.view.type === "timeGridDay";
              if (!isTimeGrid) return <>{arg.text}</>;
              return (
                <div
                  className={`flex flex-col items-center py-1 w-full ${s ? "cursor-pointer" : "cursor-default"}`}
                  onClick={() => s && openDayTxModal(dateStr)}
                >
                  <span className="text-sm font-medium">{arg.text}</span>
                  {s && (
                    <div className="flex gap-2 mt-0.5">
                      {s.totalCredit > 0 && (
                        <span className="text-[10px] font-medium text-success-600 dark:text-success-400">
                          +{fmt(s.totalCredit)}
                        </span>
                      )}
                      {s.totalDebit > 0 && (
                        <span className="text-[10px] font-medium text-error-500 dark:text-error-400">
                          -{fmt(s.totalDebit)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
            customButtons={{
              addEventButton: {
                text: "Add Event +",
                click: () => { resetAddFields(); openAdd(); },
              },
            }}
          />
        </div>

        {/* Add / Edit Event Modal */}
        <Modal isOpen={isAddOpen} onClose={() => { closeAdd(); resetAddFields(); }} className="max-w-[700px] p-6 lg:p-10">
          <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <h5 className="mb-2 font-semibold text-gray-800 dark:text-white/90 text-theme-xl lg:text-2xl">
              {selectedEvent ? "Edit Event" : "Add Event"}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Jadwalkan atau edit event untuk tetap on track</p>
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Event Title</label>
                <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30" />
              </div>
              <div>
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">Event Color</label>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(calendarsEvents).map(([key]) => (
                    <label key={key} className="flex items-center text-sm text-gray-700 dark:text-gray-400 cursor-pointer" htmlFor={`modal${key}`}>
                      <span className="relative mr-2">
                        <input className="sr-only" type="radio" name="event-level" value={key} id={`modal${key}`} checked={eventLevel === key} onChange={() => setEventLevel(key)} />
                        <span className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded-full dark:border-gray-700">
                          <span className="w-2 h-2 bg-white rounded-full dark:bg-transparent"></span>
                        </span>
                      </span>
                      {key}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Start Date</label>
                <input type="date" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">End Date</label>
                <input type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 sm:justify-end">
              <button onClick={() => { closeAdd(); resetAddFields(); }} className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto">
                Batal
              </button>
              <button onClick={handleAddOrUpdate} className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto">
                {selectedEvent ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Transaction Detail Modal */}
        <Modal isOpen={isTxOpen} onClose={closeTx} className="max-w-[600px] p-6">
          <div className="flex flex-col max-h-[80vh]">
            <h5 className="font-semibold text-gray-800 dark:text-white/90 text-lg mb-4">
              Transaksi — {fmtDateIndo(selectedDate)}
            </h5>
            {txLoading ? (
              <div className="flex justify-center py-10 text-sm text-gray-400">Memuat...</div>
            ) : dayTxs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-sm text-gray-400 dark:text-gray-500">
                <span className="text-3xl mb-2">📭</span>
                Tidak ada transaksi di tanggal ini
              </div>
            ) : (
              <>
                {(() => {
                  const credit = dayTxs.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
                  const debit = dayTxs.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
                  return (
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 rounded-lg bg-success-50 dark:bg-success-500/10 px-3 py-2">
                        <p className="text-xs text-success-600 dark:text-success-400 font-medium">Pemasukan</p>
                        <p className="text-sm font-semibold text-success-700 dark:text-success-300">{fmt(credit)}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2">
                        <p className="text-xs text-error-600 dark:text-error-400 font-medium">Pengeluaran</p>
                        <p className="text-sm font-semibold text-error-700 dark:text-error-300">{fmt(debit)}</p>
                      </div>
                    </div>
                  );
                })()}
                <div className="overflow-y-auto flex-1 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {dayTxs.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{tx.category} · {tx.provider}</p>
                      </div>
                      <span className={`text-sm font-semibold whitespace-nowrap ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-500 dark:text-error-400"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={closeTx} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
