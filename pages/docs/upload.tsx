import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsUpload() {
  return (
    <DocLayout title="Upload API">
      <SectionTitle>Upload API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/upload/list"
        desc="List semua riwayat upload (bank + wallet) milik user, diurutkan dari terbaru."
        response={`{
  "uploads": [
    {
      "id": "clxyz...",
      "sourceType": "BANK",
      "provider": "BRI",
      "accountIdentifier": "***9508",
      "accountName": "Budi Santoso",
      "fileName": "e-StatementBRImo_Mar2026.csv",
      "fileFormat": "CSV",
      "fileSizeBytes": 45231,
      "periodStart": "2026-03-01",
      "periodEnd": "2026-03-31",
      "status": "DONE",
      "errorMessage": null,
      "totalRows": 120,
      "parsedRows": 118,
      "failedRows": 2,
      "totalCredit": 8500000,
      "totalDebit": 6200000,
      "uploadedAt": "2026-04-05T15:14:01.000Z",
      "notes": null
    }
  ],
  "total": 5
}`}
      />

      <Endpoint
        method="GET"
        path="/api/upload/accounts"
        desc="Daftar rekening bank dan dompet digital aktif milik user — digunakan sebagai pilihan saat upload."
        response={`{
  "accounts": [
    { "id": "clxyz...", "type": "BANK", "provider": "BRI", "identifier": "***9508", "accountName": "Budi Santoso" },
    { "id": "clxyz...", "type": "WALLET", "provider": "GOPAY", "identifier": "***6789", "accountName": "Budi Santoso" }
  ]
}`}
      />

      <Endpoint
        method="POST"
        path="/api/upload/submit"
        desc="Upload file e-statement. Request harus menggunakan multipart/form-data. File maks 10MB. Format yang didukung: CSV, XLSX, XLS, PDF. Sistem otomatis mem-parsing file setelah upload."
        body={`// multipart/form-data
file: <binary file>
accountId: "clxyz..."
sourceType: "BANK"   // BANK | WALLET
notes: "Upload Maret 2026"  // opsional`}
        response={`// Sukses
{
  "message": "Upload berhasil diproses",
  "uploadId": "clxyz...",
  "status": "DONE",
  "parsedRows": 118,
  "failedRows": 2,
  "totalCredit": 8500000,
  "totalDebit": 6200000
}

// Duplikat file
{
  "message": "File \\"e-StatementBRImo_Mar2026.csv\\" sudah pernah diupload.",
  "code": "DUPLICATE_FILENAME"
}`}
      />

      <Endpoint
        method="GET"
        path="/api/upload/:id"
        desc="Detail satu upload berdasarkan ID, termasuk list transaksi yang berhasil di-parse."
        response={`{
  "upload": { ...upload fields },
  "transactions": [
    {
      "id": "clxyz...",
      "transactionDate": "2026-03-15T00:00:00.000Z",
      "description": "TRANSFER KE BUDI",
      "type": "DEBIT",
      "amount": 500000,
      "balance": 12000000,
      "reference": "REF123456",
      "status": "SUCCESS"
    }
  ]
}`}
      />

      <Endpoint
        method="DELETE"
        path="/api/upload/:id"
        desc="Hapus upload beserta semua transaksi yang terkait dengan upload tersebut."
        response={`{ "ok": true }`}
      />
    </DocLayout>
  );
}
