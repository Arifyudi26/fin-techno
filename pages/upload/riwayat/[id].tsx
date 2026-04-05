import { useRouter } from "next/router";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import Badge from "@components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@components/ui/table";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Mock data — nanti diganti dengan fetch dari API
const uploadsData: Record<
  string,
  {
    id: string;
    fileName: string;
    bank: string;
    accountNumber: string;
    accountName: string;
    fileFormat: string;
    fileSize: number;
    period: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    errorMessage?: string;
    totalRows: number;
    parsedRows: number;
    failedRows: number;
    totalCredit: number;
    totalDebit: number;
    uploadedAt: string;
    uploadedBy: string;
    transactions: Array<{
      id: string;
      date: string;
      description: string;
      type: "CREDIT" | "DEBIT";
      amount: number;
      balance: number;
      category: string;
      status: string;
      reference?: string;
    }>;
  }
> = {
  "1": {
    id: "1",
    fileName: "mutasi_bca_april2026.csv",
    bank: "BCA",
    accountNumber: "1234567890",
    accountName: "Demo User",
    fileFormat: "CSV",
    fileSize: 24_500,
    period: "Apr 2026",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    status: "SUCCESS",
    totalRows: 48,
    parsedRows: 48,
    failedRows: 0,
    totalCredit: 48_500_000,
    totalDebit: 31_200_000,
    uploadedAt: "2026-04-30 14:22",
    uploadedBy: "Demo User",
    transactions: [
      {
        id: "t1",
        date: "2026-04-28",
        description: "Transfer Masuk - PT Maju Jaya",
        type: "CREDIT",
        amount: 15_000_000,
        balance: 48_250_000,
        category: "Operasional",
        status: "VERIFIED",
        reference: "TRF2604280001",
      },
      {
        id: "t2",
        date: "2026-04-27",
        description: "Pembayaran Listrik PLN",
        type: "DEBIT",
        amount: 1_250_000,
        balance: 33_250_000,
        category: "Utilitas",
        status: "VERIFIED",
        reference: "PLN2604270001",
      },
      {
        id: "t3",
        date: "2026-04-26",
        description: "Gaji Karyawan April",
        type: "DEBIT",
        amount: 8_200_000,
        balance: 34_500_000,
        category: "Gaji",
        status: "VERIFIED",
      },
      {
        id: "t4",
        date: "2026-04-25",
        description: "Penjualan Produk Online",
        type: "CREDIT",
        amount: 4_500_000,
        balance: 42_700_000,
        category: "Operasional",
        status: "VERIFIED",
      },
      {
        id: "t5",
        date: "2026-04-24",
        description: "Pembelian Bahan Baku",
        type: "DEBIT",
        amount: 3_800_000,
        balance: 38_200_000,
        category: "Operasional",
        status: "PENDING",
      },
    ],
  },
  "3": {
    id: "3",
    fileName: "mutasi_mandiri_maret2026.pdf",
    bank: "Mandiri",
    accountNumber: "1122334455",
    accountName: "Demo User",
    fileFormat: "PDF",
    fileSize: 35_800,
    period: "Mar 2026",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    status: "PARTIAL",
    errorMessage:
      "3 baris tidak dapat dibaca karena format tidak sesuai (baris 12, 18, 23)",
    totalRows: 25,
    parsedRows: 22,
    failedRows: 3,
    totalCredit: 15_000_000,
    totalDebit: 12_000_000,
    uploadedAt: "2026-04-01 11:40",
    uploadedBy: "Demo User",
    transactions: [
      {
        id: "t6",
        date: "2026-03-15",
        description: "Transfer Masuk - Klien A",
        type: "CREDIT",
        amount: 8_000_000,
        balance: 18_000_000,
        category: "Operasional",
        status: "VERIFIED",
      },
      {
        id: "t7",
        date: "2026-03-10",
        description: "Biaya Internet",
        type: "DEBIT",
        amount: 750_000,
        balance: 10_000_000,
        category: "Utilitas",
        status: "VERIFIED",
      },
    ],
  },
};

const statusColor = (s: string) => {
  if (s === "SUCCESS" || s === "VERIFIED") return "success";
  if (s === "PARTIAL" || s === "PENDING") return "warning";
  if (s === "FAILED" || s === "REJECTED") return "error";
  return "info";
};

const statusLabel: Record<string, string> = {
  SUCCESS: "Berhasil",
  PARTIAL: "Sebagian",
  FAILED: "Gagal",
  VERIFIED: "Verified",
  PENDING: "Pending",
  REJECTED: "Ditolak",
};

export default function UploadDetail() {
  const router = useRouter();
  const { id } = router.query;
  const upload = uploadsData[id as string];

  if (!upload) {
    return (
      <AppLayout>
        <PageMeta title="Detail Upload | MyFinance" description="" />
        <PageBreadcrumb pageTitle="Detail Upload" />
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Data upload tidak ditemukan.
          </p>
          <Link
            href="/upload/riwayat"
            className="mt-4 inline-block text-sm text-brand-500 hover:text-brand-600"
          >
            Kembali ke Riwayat
          </Link>
        </div>
      </AppLayout>
    );
  }

  const netFlow = upload.totalCredit - upload.totalDebit;
  const successRate =
    upload.totalRows > 0
      ? Math.round((upload.parsedRows / upload.totalRows) * 100)
      : 0;

  return (
    <AppLayout>
      <PageMeta
        title={`Detail Upload — ${upload.fileName} | MyFinance`}
        description="Detail informasi upload e-statement"
      />
      <PageBreadcrumb pageTitle="Detail Upload" />

      {/* Back */}
      <div className="mb-5">
        <Link
          href="/upload/riwayat"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Kembali ke Riwayat
        </Link>
      </div>

      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <svg
                className="text-gray-500 dark:text-gray-400"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {upload.fileName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {upload.bank} · {upload.accountNumber}
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {upload.fileFormat} · {formatBytes(upload.fileSize)}
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {upload.uploadedAt}
                </span>
              </div>
            </div>
          </div>
          <Badge size="sm" color={statusColor(upload.status)}>
            {statusLabel[upload.status] ?? upload.status}
          </Badge>
        </div>

        {/* Error message */}
        {upload.errorMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 dark:border-warning-500/20 dark:bg-warning-500/10 px-4 py-3">
            <svg
              className="mt-0.5 shrink-0 text-warning-500"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-warning-700 dark:text-warning-400">
              {upload.errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Periode
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {upload.period}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {upload.periodStart} s/d {upload.periodEnd}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Total Baris
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {upload.totalRows}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Sukses: {successRate}%
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Berhasil
          </p>
          <p className="text-sm font-semibold text-success-600 dark:text-success-400">
            {upload.parsedRows}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            baris diproses
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gagal</p>
          <p
            className={`text-sm font-semibold ${upload.failedRows > 0 ? "text-error-600 dark:text-error-400" : "text-gray-400"}`}
          >
            {upload.failedRows}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            baris error
          </p>
        </div>
        <div className="rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-4">
          <p className="text-xs text-success-600 dark:text-success-400 mb-1">
            Total Masuk
          </p>
          <p className="text-sm font-bold text-success-700 dark:text-success-300">
            {formatIDR(upload.totalCredit)}
          </p>
        </div>
        <div className="rounded-2xl border border-error-200 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 p-4">
          <p className="text-xs text-error-600 dark:text-error-400 mb-1">
            Total Keluar
          </p>
          <p className="text-sm font-bold text-error-700 dark:text-error-300">
            {formatIDR(upload.totalDebit)}
          </p>
        </div>
      </div>

      {/* Net flow */}
      <div
        className={`mb-6 rounded-xl border px-5 py-4 ${netFlow >= 0 ? "border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10" : "border-error-200 bg-error-50 dark:border-error-500/20 dark:bg-error-500/10"}`}
      >
        <div className="flex items-center justify-between">
          <p
            className={`text-sm font-medium ${netFlow >= 0 ? "text-brand-700 dark:text-brand-300" : "text-error-700 dark:text-error-300"}`}
          >
            Net Flow Periode Ini
          </p>
          <p
            className={`text-lg font-bold ${netFlow >= 0 ? "text-brand-700 dark:text-brand-300" : "text-error-700 dark:text-error-300"}`}
          >
            {netFlow >= 0 ? "+" : ""}
            {formatIDR(netFlow)}
          </p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Transaksi dari Upload Ini
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {upload.transactions.length} transaksi ditampilkan
            </p>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Tanggal
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Keterangan
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Referensi
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Kategori
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Jumlah
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Saldo
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {upload.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="py-3 px-5 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                    {tx.date}
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 max-w-[220px] truncate">
                      {tx.description}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 text-gray-400 text-theme-xs dark:text-gray-500">
                    {tx.reference ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {tx.category}
                  </TableCell>
                  <TableCell className="py-3">
                    <span
                      className={`font-semibold text-theme-sm ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}
                    >
                      {tx.type === "CREDIT" ? "+" : "-"}
                      {formatIDR(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                    {formatIDR(tx.balance)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" color={statusColor(tx.status)}>
                      {statusLabel[tx.status] ?? tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
