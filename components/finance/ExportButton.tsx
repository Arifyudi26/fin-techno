"use client";

import { useRef, useState } from "react";
import { exportDashboardPDF, ExportPayload } from "@/lib/exportDashboard";
import { useI18n } from "@lib/i18n";
import { Modal } from "@components/ui/modal";
import { useModal } from "@lib/hooks/useModal";
// import { exportDashboardExcel } from "@/lib/exportDashboard";

interface Props {
  payload: ExportPayload;
}

export default function ExportButton({ payload }: Props) {
  const { t } = useI18n();
  const td = t.dashboard;

  const [open, setOpen] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const { isOpen: showDevModal, openModal: openDevModal, closeModal: closeDevModal } = useModal();
  const dropRef = useRef<HTMLDivElement>(null);

  const handleExcel = () => {
    setOpen(false);
    openDevModal();
  };

  //   const handleExcel = async () => {
  //   setLoadingXls(true);
  //   setOpen(false);
  //   try {
  //     await exportDashboardExcel(payload);
  //   } finally {
  //     setLoadingXls(false);
  //   }
  // };

  const handlePdf = async () => {
    setLoadingPdf(true);
    setOpen(false);
    try {
      await exportDashboardPDF(payload);
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <>
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={loadingPdf}
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          title={td.exportTooltip}
        >
          {loadingPdf ? (
            <svg className="h-4 w-4 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-gray-500 dark:text-gray-400">
              <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span className="hidden sm:inline">
            {loadingPdf ? td.exportingPdf : td.exportLabel}
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            className={`text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

            {/* Dropdown */}
            <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {td.exportTitle}
                </p>
              </div>

              {/* Excel */}
              <button
                onClick={handleExcel}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 dark:bg-success-500/10 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-success-600 dark:text-success-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 8l3 4-3 4M13 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="text-left">
                  <p className="font-medium leading-tight">{td.exportExcel}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{td.exportExcelDesc}</p>
                </div>
              </button>

              {/* PDF */}
              <button
                onClick={handlePdf}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-50 dark:bg-error-500/10 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-error-600 dark:text-error-400">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="text-left">
                  <p className="font-medium leading-tight">{td.exportPdf}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{td.exportPdfDesc}</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Under Development Modal */}
      <Modal
        isOpen={showDevModal}
        onClose={closeDevModal}
        showCloseButton={false}
        className="max-w-sm p-6"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-warning-500">
            <path d="M12 2L2 19h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        </div>

        {/* Content */}
        <h3 className="mb-2 text-center text-base font-semibold text-gray-900 dark:text-white">
          {td.exportDevTitle}
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {td.exportDevDesc}
        </p>

        {/* Close button */}
        <button
          onClick={closeDevModal}
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {td.exportDevClose}
        </button>
      </Modal>
    </>
  );
}
