import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsReports() {
  return (
    <DocLayout title="Reports API">
      <SectionTitle>Reports API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/reports/expense"
        desc="Laporan pengeluaran (transaksi DEBIT) untuk periode tertentu. Granularitas trend otomatis: per hari/minggu/bulan. Default: seluruh tahun berjalan."
        params={`dateFrom=2026-01-01   // opsional
dateTo=2026-03-31     // opsional
accountId=clxyz...    // opsional
accountType=BANK      // opsional: BANK | WALLET`}
        response={`{
  "filters": {
    "dateFrom": "2026-01-01",
    "dateTo": "2026-03-31",
    "accountId": null,
    "accountType": null
  },
  "summary": {
    "grandTotal": 8500000,
    "avgMonthly": 94444,
    "totalTransactions": 95,
    "prevTotal": 9200000,
    "pctChange": -7.6,
    "highestPeriod": { "label": "Jan 2026", "total": 3200000 }
  },
  "monthlyTrend": [
    { "month": "Jan 2026", "monthNum": 1, "total": 3200000, "count": 38 },
    { "month": "Feb 2026", "monthNum": 2, "total": 2800000, "count": 32 }
  ],
  "byCategory": [
    { "name": "Makan", "total": 1500000, "count": 25 },
    { "name": "Transport", "total": 800000, "count": 15 }
  ],
  "bySource": [
    { "provider": "BRI", "accountName": "Budi Santoso", "source": "BANK", "total": 6000000, "count": 70 }
  ]
}`}
      />

      <Endpoint
        method="GET"
        path="/api/reports/income"
        desc="Laporan pemasukan (transaksi CREDIT). Struktur response sama dengan /reports/expense, dengan field bestPeriod (bukan highestPeriod)."
        params={`dateFrom=2026-01-01
dateTo=2026-03-31
accountId=clxyz...
accountType=BANK`}
        response={`{
  "summary": {
    "grandTotal": 15000000,
    "avgMonthly": 166666,
    "totalTransactions": 12,
    "prevTotal": 14000000,
    "pctChange": 7.14,
    "bestPeriod": { "label": "Mar 2026", "total": 6000000 }
  },
  "monthlyTrend": [ ... ],
  "byCategory": [ ... ],
  "bySource": [ ... ]
}`}
      />

      <Endpoint
        method="GET"
        path="/api/reports/period"
        desc="Laporan gabungan per periode: income, expense, net flow, dan breakdown per sumber."
        params={`dateFrom=2026-01-01
dateTo=2026-03-31
source=ALL            // ALL | BANK | WALLET`}
        response={`{
  "period": { "from": "2026-01-01", "to": "2026-03-31" },
  "summary": {
    "totalIncome": 15000000,
    "totalExpense": 8500000,
    "netFlow": 6500000,
    "transactionCount": 107
  },
  "bySource": [ ... ],
  "trend": [ ... ]
}`}
      />
    </DocLayout>
  );
}
