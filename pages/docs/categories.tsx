import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsCategories() {
  return (
    <DocLayout title="Categories API">
      <SectionTitle>Categories API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint memerlukan{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint
        method="GET"
        path="/api/categories"
        desc="List semua kategori milik user beserta jumlah transaksi yang sudah dikategorikan."
        response={`{
  "categories": [
    {
      "id": "clxyz...",
      "name": "Makan & Minum",
      "code": "MAKAN",
      "description": "Pengeluaran untuk makanan",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "transactionCount": 85
    }
  ]
}`}
      />

      <Endpoint
        method="POST"
        path="/api/categories"
        desc="Buat kategori baru. Kode harus unik per user (maks 5 karakter, otomatis uppercase). Setelah dibuat, sistem otomatis mengassign kategori ke transaksi yang deskripsinya mengandung keyword dari nama kategori."
        body={`{
  "name": "Makan & Minum",
  "code": "MAKAN",
  "description": "Pengeluaran untuk makanan"  // opsional
}`}
        response={`{
  "category": {
    "id": "clxyz...",
    "name": "Makan & Minum",
    "code": "MAKAN",
    "description": "Pengeluaran untuk makanan",
    "createdAt": "2026-04-19T00:00:00.000Z",
    "transactionCount": 0
  }
}`}
      />

      <Endpoint
        method="PUT"
        path="/api/categories/:id"
        desc="Update nama, kode, atau deskripsi kategori."
        body={`{
  "name": "Makan Siang",
  "code": "MAKAN",
  "description": "Updated description"
}`}
        response={`{ "category": { ...updated fields } }`}
      />

      <Endpoint
        method="DELETE"
        path="/api/categories/:id"
        desc="Hapus kategori. Transaksi yang sudah dikategorikan akan kehilangan kategori ini."
        response={`{ "ok": true }`}
      />

      <Endpoint
        method="POST"
        path="/api/categories/reassign"
        desc="Re-assign semua transaksi yang belum memiliki kategori berdasarkan keyword dari semua kategori yang ada. Berguna setelah menambah kategori baru."
        response={`{
  "assigned": 42,
  "message": "42 transaksi berhasil dikategorikan"
}`}
      />
    </DocLayout>
  );
}
