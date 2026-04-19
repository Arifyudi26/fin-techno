import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle } from "@/components/docs/shared";

export default function DocsAuth() {
  return (
    <DocLayout title="Auth API">
      <SectionTitle>Auth API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        Semua endpoint di bawah ini bersifat publik — tidak memerlukan token.
      </p>

      <Endpoint
        method="POST"
        path="/api/auth/register"
        desc="Daftar akun baru langsung (tanpa OTP). Mengembalikan JWT token."
        auth={false}
        body={`{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "password123"
}`}
        response={`{
  "message": "success",
  "data": {
    "token": "eyJhbGci...",
    "role": "user",
    "name": "Budi Santoso",
    "id": "clxyz..."
  }
}`}
      />

      <Endpoint
        method="POST"
        path="/api/auth/login"
        desc="Login dengan email dan password. Mengembalikan JWT token. Tambahkan checkOnly: true untuk validasi credentials saja tanpa token (digunakan sebelum flow OTP)."
        auth={false}
        body={`{
  "email": "budi@example.com",
  "password": "password123",
  "checkOnly": false  // opsional, default false
}`}
        response={`{
  "message": "success",
  "data": {
    "token": "eyJhbGci...",
    "role": "user",
    "name": "Budi Santoso",
    "id": "clxyz...",
    "avatar": null
  }
}`}
      />

      <Endpoint
        method="POST"
        path="/api/auth/send-otp"
        desc="Kirim kode OTP 6 digit ke email. OTP berlaku 5 menit. Purpose menentukan konteks penggunaan."
        auth={false}
        body={`{
  "email": "budi@example.com",
  "purpose": "login"
  // purpose: "login" | "register" | "change-password" | "oauth"
}`}
        response={`{
  "message": "OTP berhasil dikirim"
}`}
      />

      <Endpoint
        method="POST"
        path="/api/auth/verify-otp"
        desc="Verifikasi kode OTP. Behavior berbeda tergantung purpose: register → buat user baru; login/oauth → return token; change-password → update password."
        auth={false}
        body={`// Purpose: "register"
{
  "email": "budi@example.com",
  "code": "123456",
  "purpose": "register",
  "name": "Budi Santoso",
  "password": "password123"
}

// Purpose: "login" atau "oauth"
{
  "email": "budi@example.com",
  "code": "123456",
  "purpose": "login"
}

// Purpose: "change-password"
{
  "email": "budi@example.com",
  "code": "123456",
  "purpose": "change-password",
  "password": "newpassword123"
}`}
        response={`// register / login / oauth
{
  "message": "success",
  "data": {
    "token": "eyJhbGci...",
    "role": "user",
    "name": "Budi Santoso",
    "id": "clxyz...",
    "avatar": null
  }
}

// change-password
{
  "message": "Password berhasil diubah"
}`}
      />

      <Endpoint
        method="GET"
        path="/api/auth/[...nextauth]"
        desc="NextAuth handler untuk OAuth Google dan Facebook. Digunakan secara internal oleh NextAuth — tidak dipanggil langsung."
        auth={false}
      />
    </DocLayout>
  );
}
