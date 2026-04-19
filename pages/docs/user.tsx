import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsUser() {
  return (
    <DocLayout title="User API">
      <SectionTitle>User API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/user/profile"
        desc="Ambil data profil user yang sedang login beserta statistik akun: jumlah rekening bank, dompet, upload, dan transaksi."
        response={`{
  "user": {
    "id": "clxyz...",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "role": "user",
    "avatar": null,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "stats": {
    "bankAccountCount": 2,
    "walletCount": 1,
    "uploadCount": 5,
    "transactionCount": 450
  }
}`}
      />

      <Endpoint
        method="PUT"
        path="/api/user/profile"
        desc="Update nama atau ganti password. Untuk ganti password, currentPassword wajib diisi dan divalidasi."
        body={`// Update nama saja
{
  "name": "Budi Santoso Baru"
}

// Ganti password
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}

// Keduanya sekaligus
{
  "name": "Budi Baru",
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}`}
        response={`{
  "user": {
    "id": "clxyz...",
    "name": "Budi Santoso Baru",
    "email": "budi@example.com",
    "role": "user",
    "avatar": null
  }
}`}
      />

      <Endpoint
        method="POST"
        path="/api/user/avatar"
        desc="Upload foto profil. Request menggunakan multipart/form-data. File disimpan ke Vercel Blob."
        body={`// multipart/form-data
avatar: <binary image file>`}
        response={`{
  "avatar": "https://blob.vercel-storage.com/avatars/clxyz....jpg"
}`}
      />
    </DocLayout>
  );
}
