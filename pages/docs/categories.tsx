import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsCategories() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Categories API">
      <SectionTitle>Categories API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/categories" desc={tr.api.catListDesc}
        response={`{\n  "categories": [{\n    "id": "clxyz...",\n    "name": "Makan & Minum",\n    "code": "MAKAN",\n    "description": "...",\n    "createdAt": "2026-01-01T00:00:00.000Z",\n    "transactionCount": 85\n  }]\n}`}
      />

      <Endpoint method="POST" path="/api/categories" desc={tr.api.catAddDesc}
        body={`{\n  "name": "Makan & Minum",\n  "code": "MAKAN",\n  "description": "..."  // optional\n}`}
        response={`{\n  "category": {\n    "id": "clxyz...",\n    "name": "Makan & Minum",\n    "code": "MAKAN",\n    "transactionCount": 0\n  }\n}`}
      />

      <Endpoint method="PUT" path="/api/categories/:id" desc={tr.api.catUpdateDesc}
        body={`{ "name": "...", "code": "...", "description": "..." }`}
        response={`{ "category": { ...updated fields } }`}
      />

      <Endpoint method="DELETE" path="/api/categories/:id" desc={tr.api.catDeleteDesc}
        response={`{ "ok": true }`}
      />

      <Endpoint method="POST" path="/api/categories/reassign" desc={tr.api.catReassignDesc}
        response={`{ "assigned": 42, "message": "42 transaksi berhasil dikategorikan" }`}
      />
    </DocLayout>
  );
}
