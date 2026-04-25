import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsNotifications() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Notifications API">
      <SectionTitle>Notifications API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/notifications" desc={tr.api.notifListDesc}
        response={`{\n  "notifications": [{\n    "id": "clxyz...",\n    "type": "UPLOAD_SUCCESS",\n    "title": "Upload Berhasil",\n    "message": "118 transaksi berhasil diproses",\n    "fileName": "e-StatementBRImo_Mar2026.csv",\n    "read": false,\n    "createdAt": "2026-04-05T15:14:01.000Z"\n  }],\n  "unreadCount": 3\n}`}
      />

      <Endpoint method="POST" path="/api/notifications" desc={tr.api.notifAddDesc}
        body={`{\n  "type": "UPLOAD_SUCCESS",\n  "title": "Upload Berhasil",\n  "message": "118 transaksi berhasil diproses",\n  "fileName": "..."  // optional\n}`}
        response={`{ "id": "clxyz...", "type": "UPLOAD_SUCCESS", "read": false, "createdAt": "..." }`}
      />

      <Endpoint method="PATCH" path="/api/notifications" desc={tr.api.notifPatchDesc}
        response={`{ "ok": true }`}
      />

      <Endpoint method="DELETE" path="/api/notifications" desc={tr.api.notifDeleteDesc}
        response={`{ "ok": true }`}
      />

      <Endpoint method="GET" path="/api/notifications/stream" desc={tr.api.notifStreamDesc} auth={false}
        params={`token=eyJhbGci...   // JWT token via query param`}
        response={`// SSE event stream\ndata: {"id":"clxyz...","type":"UPLOAD_SUCCESS","title":"Upload Berhasil","message":"...","read":false}\n\ndata: {"id":"clxyz...","type":"UPLOAD_FAILED","title":"Upload Gagal","message":"...","read":false}`}
      />
    </DocLayout>
  );
}
