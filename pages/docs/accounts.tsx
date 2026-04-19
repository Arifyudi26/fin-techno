import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle, SubTitle } from "@/components/docs/shared";

export default function DocsAccounts() {
  return (
    <DocLayout title="Bank & Wallet API">
      <SectionTitle>Bank Accounts & Wallets API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <SubTitle>Bank Accounts</SubTitle>

      <Endpoint
        method="GET"
        path="/api/bank-accounts"
        desc="List semua rekening bank milik user beserta statistik: total upload, total transaksi, total credit/debit, dan info upload terakhir."
        response={`{
  "accounts": [
    {
      "id": "clxyz...",
      "bankProvider": "BRI",
      "accountNumber": "039301026989508",
      "accountName": "Budi Santoso",
      "currency": "IDR",
      "description": null,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "totalUploads": 3,
      "totalTransactions": 450,
      "totalCredit": 45000000,
      "totalDebit": 32000000,
      "lastUploadDate": "2026-03-31T10:00:00.000Z",
      "lastPeriodEnd": "2026-03-31",
      "lastBalance": 13000000
    }
  ]
}`}
      />

      <Endpoint
        method="POST"
        path="/api/bank-accounts"
        desc="Tambah rekening bank baru. Nomor rekening harus unik."
        body={`{
  "bankProvider": "BRI",  // BRI | BCA | MANDIRI | BNI | CIMB | dll
  "accountNumber": "039301026989508",
  "accountName": "Budi Santoso",
  "description": "Rekening utama"  // opsional
}`}
        response={`{
  "account": {
    "id": "clxyz...",
    "bankProvider": "BRI",
    "accountNumber": "039301026989508",
    "accountName": "Budi Santoso",
    "currency": "IDR",
    "ownerId": "clxyz...",
    "isActive": true,
    "createdAt": "2026-04-19T00:00:00.000Z"
  }
}`}
      />

      <Endpoint
        method="PUT"
        path="/api/bank-accounts/:id"
        desc="Update data rekening bank (nama, deskripsi, status aktif)."
        body={`{
  "accountName": "Budi Santoso Updated",
  "description": "Rekening tabungan",
  "isActive": true
}`}
        response={`{ "account": { ...updated fields } }`}
      />

      <Endpoint
        method="DELETE"
        path="/api/bank-accounts/:id"
        desc="Hapus rekening bank beserta semua transaksi dan upload terkait."
        response={`{ "ok": true }`}
      />

      <SubTitle>Digital Wallets</SubTitle>

      <Endpoint
        method="GET"
        path="/api/wallets"
        desc="List semua dompet digital milik user beserta statistik transaksi."
        response={`{
  "wallets": [
    {
      "id": "clxyz...",
      "walletProvider": "GOPAY",
      "phoneNumber": "08123456789",
      "accountName": "Budi Santoso",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "totalUploads": 2,
      "totalTransactions": 85,
      "totalCredit": 5000000,
      "totalDebit": 4200000,
      "lastUploadDate": "2026-03-20T10:00:00.000Z"
    }
  ]
}`}
      />

      <Endpoint
        method="POST"
        path="/api/wallets"
        desc="Tambah dompet digital baru."
        body={`{
  "walletProvider": "GOPAY",  // GOPAY | OVO | DANA | SHOPEEPAY | dll
  "phoneNumber": "08123456789",
  "accountName": "Budi Santoso"
}`}
        response={`{ "wallet": { "id": "clxyz...", ...fields } }`}
      />

      <Endpoint
        method="PUT"
        path="/api/wallets/:id"
        desc="Update data dompet digital."
        body={`{
  "accountName": "Budi Updated",
  "isActive": true
}`}
        response={`{ "wallet": { ...updated fields } }`}
      />

      <Endpoint
        method="DELETE"
        path="/api/wallets/:id"
        desc="Hapus dompet digital. Soft delete jika ada transaksi terkait (isActive = false), hard delete jika tidak ada transaksi."
        response={`{ "ok": true }`}
      />
    </DocLayout>
  );
}
