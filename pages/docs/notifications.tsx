import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsNotifications() {
  return (
    <DocLayout title="Notifications API">
      <SectionTitle>Notifications API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/notifications"
        desc="List 50 notifikasi terbaru milik user beserta jumlah yang belum dibaca."
        response={`{
  "notifications": [
    {
      "id": "clxyz...",
      "userId": "clxyz...",
      "type": "UPLOAD_SUCCESS",
      "title": "Upload Berhasil",
      "message": "118 transaksi berhasil diproses dari e-StatementBRImo_Mar2026.csv",
      "fileName": "e-StatementBRImo_Mar2026.csv",
      "read": false,
      "createdAt": "2026-04-05T15:14:01.000Z"
    }
  ],
  "unreadCount": 3
}`}
      />

      <Endpoint
        method="POST"
        path="/api/notifications"
        desc="Buat notifikasi baru (digunakan secara internal oleh sistem setelah proses upload)."
        body={`{
  "type": "UPLOAD_SUCCESS",
  "title": "Upload Berhasil",
  "message": "118 transaksi berhasil diproses",
  "fileName": "e-StatementBRImo_Mar2026.csv"  // opsional
}`}
        response={`{
  "id": "clxyz...",
  "userId": "clxyz...",
  "type": "UPLOAD_SUCCESS",
  "title": "Upload Berhasil",
  "message": "118 transaksi berhasil diproses",
  "read": false,
  "createdAt": "2026-04-19T00:00:00.000Z"
}`}
      />

      <Endpoint
        method="PATCH"
        path="/api/notifications"
        desc="Tandai semua notifikasi sebagai sudah dibaca."
        response={`{ "ok": true }`}
      />

      <Endpoint
        method="DELETE"
        path="/api/notifications"
        desc="Hapus semua notifikasi milik user."
        response={`{ "ok": true }`}
      />

      <Endpoint
        method="GET"
        path="/api/notifications/stream"
        desc="Server-Sent Events (SSE) stream untuk notifikasi real-time. Karena EventSource tidak bisa mengirim header, token dikirim via query param."
        auth={false}
        params={`token=eyJhbGci...   // JWT token via query param (bukan header)`}
        response={`// SSE event stream
data: {"id":"clxyz...","type":"UPLOAD_SUCCESS","title":"Upload Berhasil","message":"...","read":false}

data: {"id":"clxyz...","type":"UPLOAD_FAILED","title":"Upload Gagal","message":"...","read":false}`}
      />
    </DocLayout>
  );
}
