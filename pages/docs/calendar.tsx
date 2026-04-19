import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsCalendar() {
  return (
    <DocLayout title="Calendar API">
      <SectionTitle>Calendar API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/calendar"
        desc="Ringkasan transaksi per hari untuk rentang tanggal tertentu. Semua tanggal dikonversi ke WIB (UTC+7). Digunakan untuk render kalender bulanan."
        params={`dateFrom=2026-03-01   // wajib, YYYY-MM-DD
dateTo=2026-03-31     // wajib, YYYY-MM-DD`}
        response={`[
  {
    "date": "2026-03-01",
    "totalCredit": 0,
    "totalDebit": 250000,
    "count": 3
  },
  {
    "date": "2026-03-15",
    "totalCredit": 5000000,
    "totalDebit": 150000,
    "count": 5
  }
]`}
      />

      <Endpoint
        method="GET"
        path="/api/calendar/[date]"
        desc="Detail semua transaksi pada tanggal tertentu (format YYYY-MM-DD). Digunakan saat user klik hari di kalender."
        params={`// Path param: date = "2026-03-15"`}
        response={`{
  "date": "2026-03-15",
  "transactions": [
    {
      "id": "clxyz...",
      "transactionDate": "2026-03-15T00:00:00.000Z",
      "description": "GAJI MARET",
      "type": "CREDIT",
      "amount": 5000000,
      "balance": 17000000,
      "reference": "REF001",
      "status": "SUCCESS",
      "source": "BANK",
      "provider": "BRI",
      "accountName": "Budi Santoso",
      "categories": [{ "name": "Gaji", "code": "GAJI" }]
    }
  ],
  "summary": { "totalCredit": 5000000, "totalDebit": 150000, "count": 5 }
}`}
      />
    </DocLayout>
  );
}
