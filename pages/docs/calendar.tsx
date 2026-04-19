import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useDocsLang } from "@lib/docs/LangContext";
import { t } from "@lib/docs/translations";

export default function DocsCalendar() {
  const { lang } = useDocsLang();
  const tr = t[lang];

  return (
    <DocLayout title="Calendar API">
      <SectionTitle>Calendar API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/calendar" desc={tr.api.calendarDesc}
        params={`dateFrom=2026-03-01   // required, YYYY-MM-DD\ndateTo=2026-03-31     // required, YYYY-MM-DD`}
        response={`[\n  { "date": "2026-03-01", "totalCredit": 0, "totalDebit": 250000, "count": 3 },\n  { "date": "2026-03-15", "totalCredit": 5000000, "totalDebit": 150000, "count": 5 }\n]`}
      />

      <Endpoint method="GET" path="/api/calendar/[date]" desc={tr.api.calendarDateDesc}
        params={`// Path param: date = "2026-03-15"`}
        response={`{\n  "date": "2026-03-15",\n  "transactions": [\n    {\n      "id": "clxyz...",\n      "transactionDate": "2026-03-15T00:00:00.000Z",\n      "description": "GAJI MARET",\n      "type": "CREDIT",\n      "amount": 5000000,\n      "balance": 17000000,\n      "source": "BANK",\n      "provider": "BRI",\n      "categories": [{ "name": "Gaji", "code": "GAJI" }]\n    }\n  ],\n  "summary": { "totalCredit": 5000000, "totalDebit": 150000, "count": 5 }\n}`}
      />
    </DocLayout>
  );
}
