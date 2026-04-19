import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

const AUTH_NOTE = (
  <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
    Semua endpoint memerlukan{" "}
    <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
  </p>
);

export default function DocsDashboard() {
  return (
    <DocLayout title="Dashboard API">
      <SectionTitle>Dashboard API</SectionTitle>
      {AUTH_NOTE}

      <Endpoint
        method="GET"
        path="/api/dashboard/metrics"
        desc="Metrik utama dashboard: total income, expense, net flow, balance, jumlah transaksi, dan persentase perubahan vs periode sebelumnya. Jika tidak ada filter tanggal, otomatis menggunakan bulan dari transaksi terbaru."
        params={`dateFrom=2026-01-01   // opsional, YYYY-MM-DD
dateTo=2026-03-31     // opsional, YYYY-MM-DD
accountId=clxyz...    // opsional, filter rekening spesifik
accountType=BANK      // opsional: BANK | WALLET`}
        response={`{
  "totalIncome": 15000000,
  "totalExpense": 8500000,
  "netFlow": 6500000,
  "totalBalance": 25000000,
  "transactionCount": 142,
  "activePeriod": {
    "month": 3,
    "year": 2026,
    "label": "Maret 2026"
  },
  "changes": {
    "income": "+12.5%",
    "expense": "-3.2%",
    "netFlow": "+45.1%",
    "transactions": "+8.0%"
  },
  "isUp": {
    "income": true,
    "expense": true,
    "netFlow": true,
    "transactions": true
  }
}`}
      />

      <Endpoint
        method="GET"
        path="/api/dashboard/cashflow"
        desc="Data cash flow (credit vs debit) dan net flow trend. Granularitas otomatis: per hari (≤31 hari), per minggu (≤92 hari), per bulan (>92 hari)."
        params={`dateFrom=2026-01-01
dateTo=2026-03-31
accountId=clxyz...    // opsional
accountType=BANK      // opsional: BANK | WALLET
categoryId=clxyz...   // opsional`}
        response={`{
  "cashFlow": [
    { "month": "Jan 2026", "credit": 5000000, "debit": 3000000, "txCount": 45 },
    { "month": "Feb 2026", "credit": 4500000, "debit": 2800000, "txCount": 38 }
  ],
  "netFlowTrend": [
    { "month": "Jan 2026", "netFlow": 2000000, "balance": 2000000, "txCount": 45 },
    { "month": "Feb 2026", "netFlow": 1700000, "balance": 3700000, "txCount": 38 }
  ]
}`}
      />

      <Endpoint
        method="GET"
        path="/api/dashboard/accounts"
        desc="Daftar semua rekening bank dan dompet digital aktif milik user, beserta saldo terakhir dari transaksi terbaru."
        response={`[
  {
    "id": "clxyz...",
    "bankProvider": "BRI",
    "accountNumber": "039301026989508",
    "accountName": "Budi Santoso",
    "currency": "IDR",
    "source": "BANK",
    "identifier": "039301026989508",
    "balance": 12500000
  },
  {
    "id": "clxyz...",
    "bankProvider": "GOPAY",
    "accountNumber": "08123456789",
    "accountName": "Budi Santoso",
    "currency": "IDR",
    "source": "WALLET",
    "identifier": "08123456789",
    "balance": 350000
  }
]`}
      />

      <Endpoint
        method="GET"
        path="/api/dashboard/transactions"
        desc="Transaksi terbaru + spending by category + income by category. Digunakan untuk widget di dashboard."
        params={`dateFrom=2026-01-01
dateTo=2026-03-31
accountId=clxyz...
accountType=BANK      // BANK | WALLET
categoryId=clxyz...
type=DEBIT            // CREDIT | DEBIT
limit=15              // default 10, maks 50`}
        response={`{
  "recentTransactions": [
    {
      "id": "clxyz...",
      "date": "2026-03-15",
      "description": "TRANSFER KE BUDI",
      "type": "DEBIT",
      "amount": 500000,
      "categories": [{ "id": "clxyz...", "name": "Transfer" }],
      "category": "Transfer",
      "bankAccount": "BRI",
      "source": "BANK",
      "status": "SUCCESS",
      "reference": "REF123456"
    }
  ],
  "spendingByCategory": [
    { "id": "clxyz...", "category": "Makan", "amount": 1500000, "count": 25 }
  ],
  "incomeByCategory": [
    { "id": "clxyz...", "category": "Gaji", "amount": 10000000, "count": 1 }
  ]
}`}
      />
    </DocLayout>
  );
}
