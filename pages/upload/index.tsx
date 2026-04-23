import { useState, useCallback, useEffect, useRef } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import BankProviderIcon from "@components/icons/providers/BankIcon";
import WalletProviderIcon from "@components/icons/providers/WalletIcon";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import { useNotifications } from "@lib/context/NotificationContext";
import { useModal } from "@lib/context/ModalContext";
import axiosGlobal from "@/services/AxiosGlobal";
import Badge from "@components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { formatBytes } from "@lib/formatters";

// Types
interface AccountOption {
  id: string;
  provider: string;
  identifier: string;
  accountName: string;
  type: "BANK" | "WALLET";
}

interface UploadItem {
  id: string;
  sourceType: "BANK" | "WALLET";
  provider: string;
  accountIdentifier: string;
  accountName: string;
  fileName: string;
  fileFormat: string;
  fileSizeBytes: number | null;
  periodStart: string;
  periodEnd: string;
  status: "UPLOADING" | "PROCESSING" | "SUCCESS" | "FAILED" | "PARTIAL";
  errorMessage?: string;
  totalRows: number;
  parsedRows: number;
  failedRows: number;
  totalCredit: number;
  totalDebit: number;
  uploadedAt: string;
  notes?: string | null;
}

// Parse notes field: "new:38,duplicate:52,failed:0"
function parseNotes(notes?: string | null): { new: number; duplicate: number; failed: number } | null {
  if (!notes || !notes.startsWith("new:")) return null;
  const parts = Object.fromEntries(notes.split(",").map((p) => p.split(":")));
  return {
    new: parseInt(parts.new ?? "0"),
    duplicate: parseInt(parts.duplicate ?? "0"),
    failed: parseInt(parts.failed ?? "0"),
  };
}

// Upload dianggap duplikat penuh jika SUCCESS tapi tidak ada transaksi baru yang masuk
const isDuplicate = (item: Pick<UploadItem, "status" | "parsedRows" | "totalRows">) =>
  item.status === "SUCCESS" && item.parsedRows === 0 && item.totalRows > 0;

interface UploadDetail extends UploadItem {
  uploadedBy: string;
  transactions: TxRow[];
}

interface TxRow {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance: number | null;
  category: string;
  status: string;
}

// Helpers
const formatIDR = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const statusConfig: Record<
  string,
  {
    label: string;
    color:
      | "success"
      | "error"
      | "warning"
      | "info"
      | "light"
      | "dark"
      | "primary";
  }
> = {
  SUCCESS: { label: "Berhasil", color: "success" },
  FAILED: { label: "Gagal", color: "error" },
  PARTIAL: { label: "Sebagian", color: "warning" },
  PROCESSING: { label: "Memproses", color: "info" },
  UPLOADING: { label: "Mengupload", color: "info" },
  DUPLICATE: { label: "Duplikat", color: "light" },
};

// Upload Form Modal
interface UploadFormProps {
  accounts: AccountOption[];
  onClose: () => void;
  onSuccess: (result: {
    uploadId?: string;
    status: string;
    parsedRows: number;
    totalRows: number;
  }) => void;
}

function UploadFormModal({ accounts, onClose, onSuccess }: UploadFormProps) {
  const [sourceType, setSourceType] = useState<"BANK" | "WALLET">("BANK");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { openModal, closeModal } = useModal();

  useEffect(() => { openModal(); return () => closeModal(); }, [openModal, closeModal]);

  const filtered = accounts.filter((a) => a.type === sourceType);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "xlsx", "xls", "pdf"].includes(ext)) {
      setError("Format tidak didukung. Gunakan CSV, XLSX, XLS, atau PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !accountId) {
      setError("Pilih rekening dan file terlebih dahulu.");
      return;
    }
    setError("");
    setLoading(true);
    setProgress(10);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("sourceType", sourceType);
    fd.append("accountId", accountId);
    fd.append("notes", notes);

    try {
      setProgress(30);
      const res = await axiosGlobal.post("/upload/submit", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 60) + 30);
        },
      });
      setProgress(100);

      // Debug logs � tampil di browser console untuk tracking masalah
      if (res.data._debug?.length) {
        console.group(`%c[Upload Debug] ${res.data.uploadId}`, "color: #6366f1; font-weight: bold");
        for (const entry of res.data._debug) {
          const ok = entry.step.includes("ERROR") || entry.step.includes("FATAL")
            ? "color: #ef4444"
            : entry.step.includes("OK") || entry.step === "DONE_OK"
              ? "color: #22c55e"
              : "color: #94a3b8";
          console.log(`%c${entry.ts} [${entry.step}]${entry.detail ? " " + entry.detail : ""}`, ok);
        }
        console.groupEnd();
      }

      onSuccess({ uploadId: res.data.uploadId, status: "PROCESSING", parsedRows: 0, totalRows: 0 });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Upload gagal. Coba lagi.";
      setError(msg);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100001 }}>
      <div
        className="absolute inset-0"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Upload e-Statement
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Rekening bank atau dompet digital
            </p>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* Source type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jenis Sumber
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(["BANK", "WALLET"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSourceType(t);
                    setAccountId("");
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    sourceType === t
                      ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {t === "BANK" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="2"
                        y="6"
                        width="20"
                        height="14"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M2 10h20"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <circle cx="17" cy="15" r="1.5" fill="currentColor" />
                    </svg>
                  )}
                  {t === "BANK" ? "Rekening Bank" : "Dompet Digital"}
                </button>
              ))}
            </div>
          </div>

          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sourceType === "BANK" ? "Pilih Rekening" : "Pilih Dompet"}
            </label>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Belum ada{" "}
                  {sourceType === "BANK" ? "rekening bank" : "dompet digital"}{" "}
                  terdaftar.
                </p>
                <a
                  href={
                    sourceType === "BANK" ? "/bank-accounts/add" : "/wallets"
                  }
                  className="text-sm text-brand-500 hover:underline mt-1 inline-block"
                >
                  + Tambah sekarang
                </a>
              </div>
            ) : (
              <div className="grid gap-2">
                {filtered.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      accountId === acc.id
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {sourceType === "BANK" ? (
                      <BankProviderIcon provider={acc.provider} size={36} />
                    ) : (
                      <WalletProviderIcon provider={acc.provider} size={36} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {acc.accountName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {acc.provider} � {acc.identifier}
                      </p>
                    </div>
                    {accountId === acc.id && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-brand-500 shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.293a1 1 0 00-1.414 0L10 14.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l6-6a1 1 0 000-1.414z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              File e-Statement
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                dragOver
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : file
                    ? "border-success-400 bg-success-50 dark:bg-success-500/10"
                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-success-500"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.293a1 1 0 00-1.414 0L10 14.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l6-6a1 1 0 000-1.414z"
                      fill="currentColor"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(file.size)}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-xs text-error-500 hover:underline"
                  >
                    Hapus file
                  </button>
                </>
              ) : (
                <>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-400"
                  >
                    <path
                      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-brand-500">
                      Klik untuk upload
                    </span>{" "}
                    atau drag & drop
                  </p>
                  <p className="text-xs text-gray-400">
                    CSV, XLSX, XLS, PDF � Maks. 10 MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Catatan{" "}
              <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contoh: e-Statement BCA Januari 2025"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 p-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="text-error-500 shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 5a1 1 0 112 0v5a1 1 0 11-2 0V7zm1 9a1.25 1.25 0 100-2.5A1.25 1.25 0 0013 16z"
                  fill="currentColor"
                />
              </svg>
              <p className="text-sm text-error-700 dark:text-error-400">
                {error}
              </p>
            </div>
          )}

          {/* Progress bar */}
          {loading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {progress < 70
                    ? "Mengupload file..."
                    : progress < 100
                      ? "Memproses transaksi..."
                      : "Selesai"}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {progress >= 70 && progress < 100 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  File besar diproses. Mohon tunggu...
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                loading || !file || !accountId
              }
              className="flex-1 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Upload Sekarang
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Detail Modal
interface DetailModalProps {
  uploadId: string;
  sourceType: "BANK" | "WALLET";
  onClose: () => void;
}

function DetailModal({ uploadId, sourceType, onClose }: DetailModalProps) {
  const [detail, setDetail] = useState<UploadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [search, setSearch] = useState("");
  const { openModal, closeModal } = useModal();

  useEffect(() => { openModal(); return () => closeModal(); }, [openModal, closeModal]);

  useEffect(() => {
    axiosGlobal
      .get(`/upload/${uploadId}?type=${sourceType}`)
      .then((r) => setDetail(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uploadId, sourceType]);

  const filteredTx =
    detail?.transactions.filter((t) => {
      const matchType = txFilter === "ALL" || t.type === txFilter;
      const matchSearch =
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        (t.reference ?? "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    }) ?? [];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100001 }}>
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Detail Upload
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg
                className="animate-spin text-brand-500"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          ) : detail ? (
            <div className="p-6 space-y-6">
              {/* Info cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Total Baris
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                    {detail.totalRows}
                  </p>
                </div>
                <div className="rounded-xl bg-success-50 dark:bg-success-500/10 p-4">
                  <p className="text-xs text-success-600 dark:text-success-400 mb-1">
                    Berhasil
                  </p>
                  <p className="text-xl font-bold text-success-700 dark:text-success-400">
                    {detail.parsedRows}
                  </p>
                </div>
                <div className="rounded-xl bg-error-50 dark:bg-error-500/10 p-4">
                  <p className="text-xs text-error-600 dark:text-error-400 mb-1">
                    Gagal
                  </p>
                  <p className="text-xl font-bold text-error-700 dark:text-error-400">
                    {detail.failedRows}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <Badge
                    size="sm"
                    color={statusConfig[detail.status]?.color ?? "light"}
                  >
                    {statusConfig[detail.status]?.label ?? detail.status}
                  </Badge>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
                  <p className="text-xs text-success-600 dark:text-success-400 mb-1">
                    Total Kredit (Masuk)
                  </p>
                  <p className="text-lg font-bold text-success-700 dark:text-success-400">
                    +{formatIDR(detail.totalCredit)}
                  </p>
                </div>
                <div className="rounded-xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
                  <p className="text-xs text-error-600 dark:text-error-400 mb-1">
                    Total Debit (Keluar)
                  </p>
                  <p className="text-lg font-bold text-error-700 dark:text-error-400">
                    -{formatIDR(detail.totalDebit)}
                  </p>
                </div>
              </div>

              {/* Meta info */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  [
                    "Akun",
                    `${detail.provider} � ${detail.accountIdentifier} (${detail.accountName})`,
                  ],
                  [
                    "File",
                    `${detail.fileName} � ${formatBytes(detail.fileSizeBytes)} � ${detail.fileFormat}`,
                  ],
                  [
                    "Periode",
                    `${formatDate(detail.periodStart)} � ${formatDate(detail.periodEnd)}`,
                  ],
                  [
                    "Diupload oleh",
                    `${detail.uploadedBy} � ${formatDate(detail.uploadedAt)}`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0">
                      {label}
                    </span>
                    <span className="text-sm text-gray-800 dark:text-white/90">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Duplicate notice */}
              {isDuplicate(detail) && (
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-500 dark:text-gray-400">
                      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 20h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Semua transaksi sudah tercatat</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {detail.totalRows} transaksi dari file ini identik dengan data yang sudah diupload sebelumnya.
                      Tidak ada transaksi baru yang ditambahkan untuk menghindari duplikasi data.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Jika ini bukan yang diharapkan, pastikan kamu tidak mengupload file yang sama dua kali (misal: CSV dan PDF dari periode yang sama).
                    </p>
                  </div>
                </div>
              )}

              {/* Overlap notice */}
              {(() => {
                const n = parseNotes(detail.notes);
                if (!n || n.duplicate === 0 || isDuplicate(detail)) return null;
                return (
                  <div className="flex items-start gap-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-4">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-500/20 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-500 dark:text-brand-400">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">File mencakup periode yang overlap</p>
                      <p className="text-sm text-brand-600/80 dark:text-brand-400/80 mt-1">
                        File ini berisi <strong>{detail.totalRows} transaksi</strong> total:
                      </p>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                          <span className="text-xs text-brand-600 dark:text-brand-400">
                            <strong>{n.new}</strong> transaksi baru ditambahkan
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            <strong>{n.duplicate}</strong> sudah ada dari upload sebelumnya
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-brand-500/70 dark:text-brand-400/60 mt-2">
                        Data yang ditampilkan di bawah hanya transaksi baru dari file ini.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Error message */}
              {detail.errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 p-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-error-500 shrink-0 mt-0.5"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 5a1 1 0 112 0v5a1 1 0 11-2 0V7zm1 9a1.25 1.25 0 100-2.5A1.25 1.25 0 0013 16z"
                      fill="currentColor"
                    />
                  </svg>
                  <p className="text-sm text-error-700 dark:text-error-400">
                    {detail.errorMessage}
                  </p>
                </div>
              )}

              {/* Transactions */}
              {detail.transactions.length > 0 && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 flex-1">
                      Transaksi{" "}
                      <span className="text-gray-400 font-normal">
                        ({filteredTx.length} dari {detail.transactions.length})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <circle
                            cx="11"
                            cy="11"
                            r="8"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M21 21l-4.35-4.35"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <input
                          type="text"
                          placeholder="Cari keterangan..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-40"
                        />
                      </div>
                      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {(["ALL", "CREDIT", "DEBIT"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setTxFilter(f)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                              txFilter === f
                                ? "bg-brand-500 text-white"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            {f === "ALL"
                              ? "Semua"
                              : f === "CREDIT"
                                ? "Masuk"
                                : "Keluar"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <Table>
                      <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                        <TableRow>
                          {[
                            "Tanggal",
                            "Keterangan",
                            "Referensi",
                            "Kategori",
                            "Jumlah",
                            "Saldo",
                            "Status",
                          ].map((h) => (
                            <TableCell
                              key={h}
                              isHeader
                              className="py-2.5 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
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
                              className="py-8 text-center text-sm text-gray-400"
                              colSpan={7}
                            >
                              Tidak ada transaksi
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTx.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatDate(tx.date)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-gray-800 dark:text-white/90 max-w-[180px] truncate">
                                {tx.description}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-gray-400 whitespace-nowrap">
                                {tx.reference ?? "-"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {tx.category}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-xs font-semibold whitespace-nowrap">
                                <span
                                  className={
                                    tx.type === "CREDIT"
                                      ? "text-success-600 dark:text-success-400"
                                      : "text-error-600 dark:text-error-400"
                                  }
                                >
                                  {tx.type === "CREDIT" ? "+" : "-"}
                                  {formatIDR(tx.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {tx.balance != null
                                  ? formatIDR(tx.balance)
                                  : "-"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3">
                                <Badge
                                  size="sm"
                                  color={
                                    tx.status === "VERIFIED"
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {tx.status === "VERIFIED"
                                    ? "Verified"
                                    : "Pending"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {detail.transactions.length >= 50 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Menampilkan 50 transaksi terbaru
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-gray-400">
              Data tidak ditemukan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Upload Card
function UploadCard({
  item,
  onViewDetail,
  onDelete,
}: {
  item: UploadItem;
  onViewDetail: () => void;
  onDelete: () => void;
}) {
  const duplicate = isDuplicate(item);
  const cfg = duplicate
    ? statusConfig["DUPLICATE"]
    : (statusConfig[item.status] ?? { label: item.status, color: "light" as const });
  const netFlow = item.totalCredit - item.totalDebit;

  return (
    <div className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 hover:border-brand-300 dark:hover:border-brand-500/40 hover:shadow-md transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {item.sourceType === "BANK" ? (
            <BankProviderIcon provider={item.provider} size={40} />
          ) : (
            <WalletProviderIcon provider={item.provider} size={40} />
          )}
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {item.accountName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.provider} � {item.accountIdentifier}
            </p>
          </div>
        </div>
        <Badge size="sm" color={cfg.color}>
          {cfg.label}
        </Badge>
      </div>

      {/* File info */}
      <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-400 shrink-0"
        >
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2v6h6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
          {item.fileName}
        </span>
        <span className="text-xs text-gray-400 shrink-0">
          {formatBytes(item.fileSizeBytes)}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">
          {item.fileFormat}
        </span>
      </div>

      {/* Period */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 2v4M8 2v4M3 10h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {formatDate(item.periodStart)} � {formatDate(item.periodEnd)}
      </div>

      {/* Banner duplikat penuh atau overlap sebagian */}
      {(() => {
        const n = parseNotes(item.notes);
        const hasOverlap = n && n.duplicate > 0 && n.new > 0;
        if (duplicate) {
          return (
            <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 mb-4">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-gray-400 shrink-0 mt-0.5">
                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 20h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Semua transaksi sudah ada</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {item.totalRows} transaksi dari file ini sudah tercatat sebelumnya. Tidak ada data baru yang ditambahkan.
                </p>
              </div>
            </div>
          );
        }
        if (hasOverlap) {
          return (
            <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-3 mb-4">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-brand-400 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <div>
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400">File mencakup periode yang overlap</p>
                <p className="text-xs text-brand-500/80 dark:text-brand-400/70 mt-0.5">
                  <span className="font-semibold">{n!.new} transaksi baru</span> ditambahkan �{" "}
                  <span>{n!.duplicate} sudah ada</span> dari upload sebelumnya
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-400 mb-0.5">Baris</p>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {item.totalRows}
          </p>
        </div>
        {(() => {
          const n = parseNotes(item.notes);
          if (duplicate) {
            return (
              <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-400 mb-0.5">Duplikat</p>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{item.totalRows}</p>
              </div>
            );
          }
          if (n && n.duplicate > 0) {
            return (
              <div className="text-center p-2 rounded-lg bg-brand-50 dark:bg-brand-500/10">
                <p className="text-xs text-brand-500 dark:text-brand-400 mb-0.5">Baru</p>
                <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{n.new}</p>
              </div>
            );
          }
          return (
            <div className="text-center p-2 rounded-lg bg-success-50 dark:bg-success-500/10">
              <p className="text-xs text-success-600 dark:text-success-400 mb-0.5">Berhasil</p>
              <p className="text-sm font-bold text-success-700 dark:text-success-400">{item.parsedRows}</p>
            </div>
          );
        })()}
        <div className="text-center p-2 rounded-lg bg-error-50 dark:bg-error-500/10">
          <p className="text-xs text-error-600 dark:text-error-400 mb-0.5">Gagal</p>
          <p className="text-sm font-bold text-error-700 dark:text-error-400">{item.failedRows}</p>
        </div>
      </div>

      {/* Credit / Debit */}
      {duplicate ? (
        <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 mb-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Data keuangan tersedia di upload sebelumnya
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2.5 rounded-lg border border-success-100 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10">
              <p className="text-xs text-success-600 dark:text-success-400 mb-0.5">Masuk</p>
              <p className="text-xs font-semibold text-success-700 dark:text-success-400 truncate">
                +{formatIDR(item.totalCredit)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg border border-error-100 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10">
              <p className="text-xs text-error-600 dark:text-error-400 mb-0.5">Keluar</p>
              <p className="text-xs font-semibold text-error-700 dark:text-error-400 truncate">
                -{formatIDR(item.totalDebit)}
              </p>
            </div>
          </div>
          <div className={`flex items-center justify-between p-2.5 rounded-lg mb-4 ${netFlow >= 0 ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
            <span className="text-xs text-gray-500 dark:text-gray-400">Net Flow</span>
            <span className={`text-sm font-bold ${netFlow >= 0 ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}`}>
              {netFlow >= 0 ? "+" : ""}{formatIDR(netFlow)}
            </span>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {formatDate(item.uploadedAt)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:text-error-400 dark:hover:bg-error-500/10 transition-colors"
            title="Hapus"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onViewDetail}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
            title="Lihat Detail"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function UploadPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailItem, setDetailItem] = useState<{
    id: string;
    sourceType: "BANK" | "WALLET";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "BANK" | "WALLET">(
    "ALL",
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { toastState, fire, close } = useToast();
  const { addNotification } = useNotifications();
  const { openModal, closeModal } = useModal();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await axiosGlobal.get("/upload/accounts");
      setAccounts([...res.data.bankAccounts, ...res.data.wallets]);
    } catch {
      fire("error", "Gagal memuat daftar akun");
    } finally {
      setLoadingAccounts(false);
    }
  }, [fire]);

  const fetchUploads = useCallback(async () => {
    setLoadingUploads(true);
    try {
      const res = await axiosGlobal.get("/upload/list");
      setUploads(res.data.uploads);
    } catch {
      fire("error", "Gagal memuat riwayat upload");
    } finally {
      setLoadingUploads(false);
    }
  }, [fire]);

  useEffect(() => {
    fetchAccounts();
    fetchUploads();
  }, [fetchAccounts, fetchUploads]);

  const handleUploadSuccess = (result: {
    uploadId?: string;
    status: string;
    parsedRows: number;
    totalRows: number;
  }) => {
    setShowForm(false);
    closeModal();
    fetchUploads();

    if (result.status === "PROCESSING" && result.uploadId) {
      // Polling di background � refresh list setiap 5 detik sampai selesai
      const uploadId = result.uploadId;
      const maxAttempts = 60;
      let attempt = 0;
      const poll = setInterval(async () => {
        attempt++;
        try {
          const res = await axiosGlobal.get(`/upload/${uploadId}`);
          const { status, parsedRows: parsed, totalRows: total, fileName } = res.data;
          if (status === "SUCCESS" || status === "FAILED" || status === "PARTIAL") {
            clearInterval(poll);
            fetchUploads();
            const allDuplicate = status === "SUCCESS" && parsed === 0 && total > 0;
            addNotification({
              type: allDuplicate ? "info" : status === "SUCCESS" ? "success" : status === "PARTIAL" ? "warning" : "error",
              title: allDuplicate ? "Transaksi Sudah Ada" : status === "SUCCESS" ? "Upload Berhasil" : status === "PARTIAL" ? "Upload Sebagian" : "Upload Gagal",
              message: allDuplicate
                ? `${total} transaksi dari file ini sudah tercatat sebelumnya.`
                : status === "SUCCESS"
                  ? `${parsed} dari ${total} transaksi berhasil diproses.`
                  : status === "PARTIAL"
                    ? `${parsed} dari ${total} transaksi berhasil. Beberapa baris gagal.`
                    : "Terjadi kesalahan saat memproses file.",
              fileName: fileName,
            });
          }
        } catch { /* lanjut polling */ }
        if (attempt >= maxAttempts) clearInterval(poll);
      }, 5000);
      return;
    }

    const isSuccess = result.status === "SUCCESS";
    const isPartial = result.status === "PARTIAL";
    addNotification({
      type: isSuccess ? "success" : isPartial ? "warning" : "error",
      title: isSuccess ? "Upload Berhasil" : isPartial ? "Upload Sebagian" : "Upload Gagal",
      message: isSuccess
        ? `${result.parsedRows} dari ${result.totalRows} transaksi berhasil diproses.`
        : isPartial
          ? `${result.parsedRows} dari ${result.totalRows} transaksi berhasil. Beberapa baris gagal diproses.`
          : "Terjadi kesalahan saat memproses file.",
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosGlobal.delete(`/upload/${deleteTarget.id}?type=${deleteTarget.sourceType}`);
      setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      closeModal();
      fire("success", "Upload dihapus", { message: "Data upload dan transaksi terkait berhasil dihapus.", duration: 3000 });
    } catch {
      fire("error", "Gagal menghapus upload");
    } finally {
      setDeleting(false);
    }
  };

  const filteredUploads = uploads.filter((u) => {
    const matchType = filterType === "ALL" || u.sourceType === filterType;
    const matchStatus = filterStatus === "ALL" || u.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      u.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const stats = {
    total: uploads.length,
    success: uploads.filter((u) => u.status === "SUCCESS").length,
    failed: uploads.filter((u) => u.status === "FAILED").length,
    partial: uploads.filter((u) => u.status === "PARTIAL").length,
    totalCredit: uploads.reduce((s, u) => s + u.totalCredit, 0),
    totalDebit: uploads.reduce((s, u) => s + u.totalDebit, 0),
  };

  return (
    <AppLayout>
      <PageMeta
        title="Upload e-Statement | Fin-Techno"
        description="Upload e-Statement rekening bank dan dompet digital"
      />
      <PageBreadcrumb pageTitle="Upload e-Statement" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Upload",
            value: stats.total,
            icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
            color: "text-brand-500",
            bg: "bg-brand-50 dark:bg-brand-500/10",
          },
          {
            label: "Berhasil",
            value: stats.success,
            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            color: "text-success-500",
            bg: "bg-success-50 dark:bg-success-500/10",
          },
          {
            label: "Gagal",
            value: stats.failed,
            icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
            color: "text-error-500",
            bg: "bg-error-50 dark:bg-error-500/10",
          },
          {
            label: "Sebagian",
            value: stats.partial,
            icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
            color: "text-warning-500",
            bg: "bg-warning-50 dark:bg-warning-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4 flex items-center gap-4"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg} shrink-0`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className={s.color}
              >
                <path
                  d={s.icon}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {s.label}
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Net flow banner */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 dark:bg-success-500/20 shrink-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-success-600"
              >
                <path
                  d="M12 19V5M5 12l7-7 7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-success-600 dark:text-success-400">
                Total Kredit
              </p>
              <p className="text-base font-bold text-success-700 dark:text-success-400">
                +{formatIDR(stats.totalCredit)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-100 dark:bg-error-500/20 shrink-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-error-600"
              >
                <path
                  d="M12 5v14M5 12l7 7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-error-600 dark:text-error-400">
                Total Debit
              </p>
              <p className="text-base font-bold text-error-700 dark:text-error-400">
                -{formatIDR(stats.totalDebit)}
              </p>
            </div>
          </div>
          <div
            className={`rounded-2xl border p-4 flex items-center gap-4 ${stats.totalCredit - stats.totalDebit >= 0 ? "border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10" : "border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10"}`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${stats.totalCredit - stats.totalDebit >= 0 ? "bg-success-100 dark:bg-success-500/20" : "bg-error-100 dark:bg-error-500/20"}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className={
                  stats.totalCredit - stats.totalDebit >= 0
                    ? "text-success-600"
                    : "text-error-600"
                }
              >
                <path
                  d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p
                className={`text-xs ${stats.totalCredit - stats.totalDebit >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}
              >
                Net Flow
              </p>
              <p
                className={`text-base font-bold ${stats.totalCredit - stats.totalDebit >= 0 ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}`}
              >
                {stats.totalCredit - stats.totalDebit >= 0 ? "+" : ""}
                {formatIDR(stats.totalCredit - stats.totalDebit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Cari akun, provider, atau nama file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "ALL" | "BANK" | "WALLET")
            }
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="BANK">Bank</option>
            <option value="WALLET">Dompet Digital</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="ALL">Semua Status</option>
            <option value="SUCCESS">Berhasil</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="FAILED">Gagal</option>
            <option value="PROCESSING">Memproses</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            disabled={loadingAccounts}
            className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Upload Baru
          </button>
        </div>
      </div>

      {/* Upload list */}
      {loadingUploads ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                </div>
              </div>
              <div className="h-8 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="grid grid-cols-3 gap-2">
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[...Array(2)].map((_, j) => (
                  <div
                    key={j}
                    className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredUploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-400"
            >
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
            {uploads.length === 0 ? "Belum ada upload" : "Tidak ada hasil"}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {uploads.length === 0
              ? "Upload e-Statement rekening bank atau dompet digital Anda"
              : "Coba ubah filter atau kata kunci pencarian"}
          </p>
          {uploads.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Upload Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUploads.map((item) => (
            <UploadCard
              key={item.id}
              item={item}
              onViewDetail={() =>
                setDetailItem({ id: item.id, sourceType: item.sourceType })
              }
              onDelete={() => { setDeleteTarget(item); openModal(); }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <UploadFormModal
          accounts={accounts}
          onClose={() => setShowForm(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
      {detailItem && (
        <DetailModal
          uploadId={detailItem.id}
          sourceType={detailItem.sourceType}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center px-4" style={{ zIndex: 100001 }}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error-50 dark:bg-error-500/10 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Hapus Upload?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <div className="mb-5 rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{deleteTarget.fileName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {deleteTarget.provider} � {deleteTarget.periodStart} s/d {deleteTarget.periodEnd}
              </p>
              <p className="text-xs text-error-500 mt-1">Semua transaksi terkait juga akan dihapus permanen.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); closeModal(); }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Menghapus...
                  </>
                ) : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}

