import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsReports() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Reports API">
      <SectionTitle>Reports API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/reports/expense" desc={tr.api.expenseDesc}
        params={`dateFrom=2026-01-01   // optional\ndateTo=2026-03-31     // optional\naccountId=clxyz...    // optional\naccountType=BANK      // optional: BANK | WALLET`}
        response={`{\n  "summary": {\n    "grandTotal": 8500000,\n    "avgMonthly": 94444,\n    "totalTransactions": 95,\n    "prevTotal": 9200000,\n    "pctChange": -7.6,\n    "highestPeriod": { "label": "Jan 2026", "total": 3200000 }\n  },\n  "monthlyTrend": [{ "month": "Jan 2026", "monthNum": 1, "total": 3200000, "count": 38 }],\n  "byCategory": [{ "name": "Makan", "total": 1500000, "count": 25 }],\n  "bySource": [{ "provider": "BRI", "accountName": "Budi Santoso", "source": "BANK", "total": 6000000, "count": 70 }]\n}`}
      />

      <Endpoint method="GET" path="/api/reports/income" desc={tr.api.incomeDesc}
        params={`dateFrom=2026-01-01\ndateTo=2026-03-31\naccountId=clxyz...\naccountType=BANK`}
        response={`{\n  "summary": {\n    "grandTotal": 15000000,\n    "pctChange": 7.14,\n    "bestPeriod": { "label": "Mar 2026", "total": 6000000 }\n  },\n  "monthlyTrend": [ ... ],\n  "byCategory": [ ... ],\n  "bySource": [ ... ]\n}`}
      />

      <Endpoint method="GET" path="/api/reports/period" desc={tr.api.periodDesc}
        params={`dateFrom=2026-01-01\ndateTo=2026-03-31\nsource=ALL            // ALL | BANK | WALLET`}
        response={`{\n  "period": { "from": "2026-01-01", "to": "2026-03-31" },\n  "summary": {\n    "totalIncome": 15000000,\n    "totalExpense": 8500000,\n    "netFlow": 6500000,\n    "transactionCount": 107\n  },\n  "bySource": [ ... ],\n  "trend": [ ... ]\n}`}
      />
    </DocLayout>
  );
}
