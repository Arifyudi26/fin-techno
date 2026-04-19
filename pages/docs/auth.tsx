import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";
import { useDocsLang } from "@lib/docs/LangContext";
import { t } from "@lib/docs/translations";

export default function DocsAuth() {
  const { lang } = useDocsLang();
  const tr = t[lang].api;

  return (
    <DocLayout title="Auth API">
      <SectionTitle>Auth API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">{tr.authPublicNote}</p>

      <Endpoint method="POST" path="/api/auth/register" desc={tr.registerDesc} auth={false}
        body={`{\n  "name": "Budi Santoso",\n  "email": "budi@example.com",\n  "password": "password123"\n}`}
        response={`{\n  "message": "success",\n  "data": {\n    "token": "eyJhbGci...",\n    "role": "user",\n    "name": "Budi Santoso",\n    "id": "clxyz..."\n  }\n}`}
      />

      <Endpoint method="POST" path="/api/auth/login" desc={tr.loginDesc} auth={false}
        body={`{\n  "email": "budi@example.com",\n  "password": "password123",\n  "checkOnly": false  // optional, default false\n}`}
        response={`{\n  "message": "success",\n  "data": {\n    "token": "eyJhbGci...",\n    "role": "user",\n    "name": "Budi Santoso",\n    "id": "clxyz...",\n    "avatar": null\n  }\n}`}
      />

      <Endpoint method="POST" path="/api/auth/send-otp" desc={tr.sendOtpDesc} auth={false}
        body={`{\n  "email": "budi@example.com",\n  "purpose": "login"\n  // purpose: "login" | "register" | "change-password" | "oauth"\n}`}
        response={`{\n  "message": "OTP berhasil dikirim"\n}`}
      />

      <Endpoint method="POST" path="/api/auth/verify-otp" desc={tr.verifyOtpDesc} auth={false}
        body={`// Purpose: "register"\n{\n  "email": "budi@example.com",\n  "code": "123456",\n  "purpose": "register",\n  "name": "Budi Santoso",\n  "password": "password123"\n}\n\n// Purpose: "login"\n{\n  "email": "budi@example.com",\n  "code": "123456",\n  "purpose": "login"\n}\n\n// Purpose: "change-password"\n{\n  "email": "budi@example.com",\n  "code": "123456",\n  "purpose": "change-password",\n  "password": "newpassword123"\n}`}
        response={`// register / login / oauth\n{\n  "message": "success",\n  "data": {\n    "token": "eyJhbGci...",\n    "role": "user",\n    "name": "Budi Santoso",\n    "id": "clxyz...",\n    "avatar": null\n  }\n}\n\n// change-password\n{\n  "message": "Password berhasil diubah"\n}`}
      />

      <Endpoint method="GET" path="/api/auth/[...nextauth]" desc={tr.nextauthDesc} auth={false} />
    </DocLayout>
  );
}
