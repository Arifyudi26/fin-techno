import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsAI() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="AI API">
      <SectionTitle>AI API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="POST"
        path="/api/ai/chat"
        desc={tr.api.aiChatDesc}
        body={`{\n  "message": "Berapa total pengeluaran saya bulan ini?",\n  "history": [\n    { "role": "user", "parts": "Halo" },\n    { "role": "model", "parts": "Halo! Ada yang bisa saya bantu?" }\n  ],\n  "lang": "id"   // "id" | "en" — optional, default "id"\n}`}
        response={`{\n  "reply": "Total pengeluaran kamu bulan Mei 2026 adalah Rp 3.250.000, ..."\n}`}
      />

      <Endpoint
        method="GET"
        path="/api/ai/analyze"
        desc={tr.api.aiAnalyzeDesc}
        params={`lang=id   // "id" | "en" — optional, default "id"`}
        response={`{\n  "analysis": "## Kondisi Keuangan Keseluruhan\\n\\n✅ **Kondisi Baik** ...",\n  "context": {\n    "months": [\n      { "key": "2026-01", "label": "Januari 2026", "credit": 10000000, "debit": 7500000, "count": 45, "netFlow": 2500000 }\n    ],\n    "topCategories": [\n      { "name": "Makan & Minum", "amount": 2500000 },\n      { "name": "Transport", "amount": 800000 }\n    ],\n    "totalIncome": 30000000,\n    "totalExpense": 22000000,\n    "netFlow": 8000000,\n    "maxExpenseMonth": { "key": "2026-03", "label": "Maret 2026", "debit": 9000000 },\n    "maxIncomeMonth": { "key": "2026-01", "label": "Januari 2026", "credit": 12000000 },\n    "negativeMonths": 0\n  }\n}`}
      />
    </DocLayout>
  );
}
