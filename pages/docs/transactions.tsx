import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsTransactions() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Transactions API">
      <SectionTitle>Transactions API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/transactions" desc={tr.api.txListDesc}
        params={`page=1              // default 1\nlimit=10            // default 10, max 100\ndateFrom=2026-01-01\ndateTo=2026-03-31\ntype=DEBIT          // CREDIT | DEBIT | ALL\nsource=ALL          // ALL | BANK | WALLET\nsearch=transfer\ncategory=clxyz...\naccountId=clxyz...`}
        response={`{\n  "transactions": [\n    {\n      "id": "clxyz...",\n      "source": "BANK",\n      "date": "2026-03-15",\n      "description": "TRANSFER KE BUDI",\n      "type": "DEBIT",\n      "amount": 500000,\n      "balance": 12000000,\n      "status": "SUCCESS",\n      "provider": "BRI",\n      "categories": [{ "name": "Transfer", "code": "TRF" }]\n    }\n  ],\n  "total": 142,\n  "page": 1,\n  "totalPages": 15,\n  "summary": { "totalCredit": 15000000, "totalDebit": 8500000, "netFlow": 6500000 }\n}`}
      />
    </DocLayout>
  );
}
