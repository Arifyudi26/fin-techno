import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsTransactions() {
  return (
    <DocLayout title="Transactions API">
      <SectionTitle>Transactions API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/transactions"
        desc="List semua transaksi (bank + wallet) dengan pagination, filter, dan summary. Menggunakan single UNION ALL query untuk performa optimal."
        params={`page=1              // default 1
limit=10            // default 10, maks 100
dateFrom=2026-01-01 // opsional, YYYY-MM-DD
dateTo=2026-03-31   // opsional, YYYY-MM-DD
type=DEBIT          // opsional: CREDIT | DEBIT | ALL
source=ALL          // opsional: ALL | BANK | WALLET
search=transfer     // opsional, pencarian di deskripsi (case-insensitive)
category=clxyz...   // opsional, filter by category ID
accountId=clxyz...  // opsional, filter by rekening/wallet ID`}
        response={`{
  "transactions": [
    {
      "id": "clxyz...",
      "source": "BANK",
      "date": "2026-03-15",
      "description": "TRANSFER KE BUDI",
      "reference": "REF123456",
      "type": "DEBIT",
      "amount": 500000,
      "balance": 12000000,
      "status": "SUCCESS",
      "accountName": "Budi Santoso",
      "provider": "BRI",
      "categories": [{ "name": "Transfer", "code": "TRF" }],
      "category": "Transfer",
      "categoryCode": "TRF"
    }
  ],
  "total": 142,
  "page": 1,
  "totalPages": 15,
  "summary": {
    "totalCredit": 15000000,
    "totalDebit": 8500000,
    "netFlow": 6500000
  }
}`}
      />
    </DocLayout>
  );
}
