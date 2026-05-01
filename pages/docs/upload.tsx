import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsUpload() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Upload API">
      <SectionTitle>Upload API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/upload/list" desc={tr.api.uploadListDesc}
        response={`{\n  "uploads": [{\n    "id": "clxyz...",\n    "sourceType": "BANK",\n    "provider": "BRI",\n    "accountIdentifier": "***9508",\n    "fileName": "e-StatementBRImo_Mar2026.csv",\n    "fileFormat": "CSV",\n    "periodStart": "2026-03-01",\n    "periodEnd": "2026-03-31",\n    "status": "DONE",\n    "totalRows": 120,\n    "parsedRows": 118,\n    "failedRows": 2,\n    "totalCredit": 8500000,\n    "totalDebit": 6200000,\n    "uploadedAt": "2026-04-05T15:14:01.000Z"\n  }],\n  "total": 5\n}`}
      />

      <Endpoint method="GET" path="/api/upload/accounts" desc={tr.api.uploadAccountsDesc}
        response={`{\n  "accounts": [\n    { "id": "clxyz...", "type": "BANK", "provider": "BRI", "identifier": "***9508", "accountName": "Budi Santoso" },\n    { "id": "clxyz...", "type": "WALLET", "provider": "GOPAY", "identifier": "***6789", "accountName": "Budi Santoso" }\n  ]\n}`}
      />

      <Endpoint method="POST" path="/api/upload/submit" desc={tr.api.uploadSubmitDesc}
        body={`// multipart/form-data\nfile: <binary file>\naccountId: "clxyz..."\nsourceType: "BANK"   // BANK | WALLET\nnotes: "..."         // optional\npdfPassword: "..."   // optional — required if PDF is password-protected`}
        response={`// Success (async processing started)\n{\n  "message": "Upload berhasil diproses",\n  "uploadId": "clxyz...",\n  "status": "PROCESSING",\n  "parsedRows": 0,\n  "failedRows": 0,\n  "totalCredit": 0,\n  "totalDebit": 0\n}\n\n// Duplicate\n{\n  "message": "File already uploaded.",\n  "code": "DUPLICATE_FILENAME"\n}\n\n// PDF is password-protected (no password provided)\n// HTTP 423\n{\n  "message": "PDF ini dilindungi password.",\n  "code": "PDF_PASSWORD_REQUIRED"\n}\n\n// Wrong PDF password\n// HTTP 422\n{\n  "message": "Password PDF salah.",\n  "code": "PDF_PASSWORD_WRONG"\n}`}
      />

      <Endpoint method="GET" path="/api/upload/:id" desc={tr.api.uploadDetailDesc}
        response={`{\n  "upload": { ...upload fields },\n  "transactions": [\n    {\n      "id": "clxyz...",\n      "transactionDate": "2026-03-15T00:00:00.000Z",\n      "description": "TRANSFER KE BUDI",\n      "type": "DEBIT",\n      "amount": 500000,\n      "balance": 12000000,\n      "status": "SUCCESS"\n    }\n  ]\n}`}
      />

      <Endpoint method="DELETE" path="/api/upload/:id" desc={tr.api.uploadDeleteDesc}
        response={`{ "ok": true }`}
      />
    </DocLayout>
  );
}
