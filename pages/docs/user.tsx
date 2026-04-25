import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsUser() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="User API">
      <SectionTitle>User API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <Endpoint method="GET" path="/api/user/profile" desc={tr.api.userGetDesc}
        response={`{\n  "user": {\n    "id": "clxyz...",\n    "name": "Budi Santoso",\n    "email": "budi@example.com",\n    "role": "user",\n    "avatar": null,\n    "createdAt": "2026-01-01T00:00:00.000Z"\n  },\n  "stats": {\n    "bankAccountCount": 2,\n    "walletCount": 1,\n    "uploadCount": 5,\n    "transactionCount": 450\n  }\n}`}
      />

      <Endpoint method="PUT" path="/api/user/profile" desc={tr.api.userUpdateDesc}
        body={`// Update name only\n{ "name": "Budi Santoso Baru" }\n\n// Change password\n{\n  "currentPassword": "oldpassword123",\n  "newPassword": "newpassword456"\n}`}
        response={`{ "user": { "id": "clxyz...", "name": "Budi Santoso Baru", "email": "...", "role": "user", "avatar": null } }`}
      />

      <Endpoint method="POST" path="/api/user/avatar" desc={tr.api.userAvatarDesc}
        body={`// multipart/form-data\navatar: <binary image file>`}
        response={`{ "avatar": "https://blob.vercel-storage.com/avatars/clxyz....jpg" }`}
      />
    </DocLayout>
  );
}
