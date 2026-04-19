import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useDocsLang } from "@lib/docs/LangContext";
import { t } from "@lib/docs/translations";

export default function DocsDashboard() {
  const { lang } = useDocsLang();
  const tr = t[lang];

  return (
    <DocLayout title="Dashboard API">
      <SectionTitle>Dashboard API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/dashboard/metrics" desc={tr.api.metricsDesc}
        params={`dateFrom=2026-01-01   // optional, YYYY-MM-DD\ndateTo=2026-03-31     // optional, YYYY-MM-DD\naccountId=clxyz...    // optional\naccountType=BANK      // optional: BANK | WALLET`}
        response={`{\n  "totalIncome": 15000000,\n  "totalExpense": 8500000,\n  "netFlow": 6500000,\n  "totalBalance": 25000000,\n  "transactionCount": 142,\n  "activePeriod": { "month": 3, "year": 2026, "label": "Maret 2026" },\n  "changes": { "income": "+12.5%", "expense": "-3.2%", "netFlow": "+45.1%", "transactions": "+8.0%" },\n  "isUp": { "income": true, "expense": true, "netFlow": true, "transactions": true }\n}`}
      />

      <Endpoint method="GET" path="/api/dashboard/cashflow" desc={tr.api.cashflowDesc}
        params={`dateFrom=2026-01-01\ndateTo=2026-03-31\naccountId=clxyz...    // optional\naccountType=BANK      // optional: BANK | WALLET\ncategoryId=clxyz...   // optional`}
        response={`{\n  "cashFlow": [\n    { "month": "Jan 2026", "credit": 5000000, "debit": 3000000, "txCount": 45 }\n  ],\n  "netFlowTrend": [\n    { "month": "Jan 2026", "netFlow": 2000000, "balance": 2000000, "txCount": 45 }\n  ]\n}`}
      />

      <Endpoint method="GET" path="/api/dashboard/accounts" desc={tr.api.dashAccountsDesc}
        response={`[\n  {\n    "id": "clxyz...",\n    "bankProvider": "BRI",\n    "accountNumber": "039301026989508",\n    "accountName": "Budi Santoso",\n    "currency": "IDR",\n    "source": "BANK",\n    "balance": 12500000\n  }\n]`}
      />

      <Endpoint method="GET" path="/api/dashboard/transactions" desc={tr.api.dashTxDesc}
        params={`dateFrom=2026-01-01\ndateTo=2026-03-31\naccountId=clxyz...\naccountType=BANK\ncategoryId=clxyz...\ntype=DEBIT            // CREDIT | DEBIT\nlimit=15              // default 10, max 50`}
        response={`{\n  "recentTransactions": [\n    {\n      "id": "clxyz...",\n      "date": "2026-03-15",\n      "description": "TRANSFER KE BUDI",\n      "type": "DEBIT",\n      "amount": 500000,\n      "category": "Transfer",\n      "bankAccount": "BRI",\n      "source": "BANK",\n      "status": "SUCCESS"\n    }\n  ],\n  "spendingByCategory": [{ "category": "Makan", "amount": 1500000, "count": 25 }],\n  "incomeByCategory": [{ "category": "Gaji", "amount": 10000000, "count": 1 }]\n}`}
      />
    </DocLayout>
  );
}
