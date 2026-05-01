import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsDashboard() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Dashboard API">
      <SectionTitle>Dashboard API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/dashboard/metrics" desc={tr.api.metricsDesc}
        params={`dateFrom=2026-01-01   // optional, YYYY-MM-DD\ndateTo=2026-03-31     // optional, YYYY-MM-DD\naccountId=clxyz...    // optional\naccountType=BANK      // optional: BANK | WALLET`}
        response={`{\n  "totalIncome": 15000000,\n  "totalExpense": 8500000,\n  "netFlow": 6500000,\n  "totalBalance": 25000000,\n  "transactionCount": 142,\n  "activePeriod": {\n    "month": 3,\n    "year": 2026,\n    "label": "Maret 2026"           // atau "2026-01-01 – 2026-03-31" jika pakai filter tanggal\n  },\n  "changes": {\n    "income": "+12.5%",\n    "expense": "-3.2%",\n    "netFlow": "+45.1%",\n    "transactions": "+8.0%"\n  },\n  "isUp": {\n    "income": true,\n    "expense": true,                // true jika expense TURUN (lebih hemat)\n    "netFlow": true,\n    "transactions": true\n  }\n}`}
      />

      <Endpoint method="GET" path="/api/dashboard/cashflow" desc={tr.api.cashflowDesc}
        params={`dateFrom=2026-01-01   // optional, default: 12 bulan terakhir\ndateTo=2026-03-31     // optional\naccountId=clxyz...    // optional\naccountType=BANK      // optional: BANK | WALLET\ncategoryId=clxyz...   // optional`}
        response={`// Granularitas label otomatis:\n// ≤31 hari  → "15 Jan", "16 Jan", ...\n// ≤92 hari  → "Mg 1", "Mg 2", ...\n// >92 hari  → "Jan 2026", "Feb 2026", ...\n{\n  "cashFlow": [\n    { "month": "Jan 2026", "credit": 5000000, "debit": 3000000, "txCount": 45 }\n  ],\n  "netFlowTrend": [\n    { "month": "Jan 2026", "netFlow": 2000000, "balance": 2000000, "txCount": 45 }\n    // balance = running cumulative net flow sejak awal periode\n  ]\n}`}
      />

      <Endpoint method="GET" path="/api/dashboard/accounts" desc={tr.api.dashAccountsDesc}
        response={`// Array gabungan bank + wallet aktif\n[\n  {\n    "id": "clxyz...",\n    "bankProvider": "BRI",\n    "accountNumber": "039301026989508",\n    "accountName": "Budi Santoso",\n    "currency": "IDR",\n    "source": "BANK",\n    "identifier": "039301026989508",  // = accountNumber untuk bank, phoneNumber untuk wallet\n    "balance": 12500000               // saldo dari transaksi terakhir\n  },\n  {\n    "id": "clxyz...",\n    "bankProvider": "GOPAY",          // walletProvider dipetakan ke field bankProvider\n    "accountNumber": "08123456789",   // phoneNumber\n    "accountName": "Budi Santoso",\n    "currency": "IDR",\n    "source": "WALLET",\n    "identifier": "08123456789",\n    "balance": 350000\n  }\n]`}
      />

      <Endpoint method="GET" path="/api/dashboard/transactions" desc={tr.api.dashTxDesc}
        params={`dateFrom=2026-01-01   // optional, default: 90 hari terakhir\ndateTo=2026-03-31     // optional\naccountId=clxyz...    // optional\naccountType=BANK      // optional: BANK | WALLET\ncategoryId=clxyz...   // optional\ntype=DEBIT            // optional: CREDIT | DEBIT\nsearch=transfer       // optional, pencarian deskripsi (case-insensitive)\nlimit=15              // optional, default 10, max 50`}
        response={`{\n  "recentTransactions": [\n    {\n      "id": "clxyz...",\n      "date": "2026-03-15",\n      "description": "TRANSFER KE BUDI",\n      "type": "DEBIT",\n      "amount": 500000,\n      "categories": [{ "id": "clxyz...", "name": "Transfer" }],  // array, bisa kosong\n      "category": "Transfer",   // nama kategori pertama, atau "Lainnya"\n      "bankAccount": "BRI",     // bankProvider atau walletProvider\n      "source": "BANK",         // BANK | WALLET\n      "status": "SUCCESS",\n      "reference": "TRF123456"  // bisa null\n    }\n  ],\n  "spendingByCategory": [\n    { "id": "clxyz...", "category": "Makan", "amount": 1500000, "count": 25 }\n  ],\n  "incomeByCategory": [\n    { "id": "clxyz...", "category": "Gaji", "amount": 10000000, "count": 1 }\n  ]\n}`}
      />
    </DocLayout>
  );
}
