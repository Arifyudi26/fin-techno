# Fin-Techno

Aplikasi manajemen keuangan pribadi — upload e-statement bank & dompet digital, parsing otomatis, kategorisasi, analitik keuangan, dan AI financial assistant berbasis Gemini.

---

## Demo & Dokumentasi API

| | URL |
|---|---|
| **Demo (Production)** | [https://fin-techno.vercel.app](https://fin-techno.vercel.app) |
| **API Docs (Swagger)** | [https://fin-techno.vercel.app/docs](https://fin-techno.vercel.app/docs) |

> Halaman `/docs` berisi **Swagger UI** — dokumentasi interaktif seluruh REST API.  
> Bisa dibuka **tanpa login**, tapi untuk mencoba endpoint yang butuh auth, klik **Authorize** dan masukkan JWT token.
>
> Untuk akses docs di local, jalankan dev server lalu buka `http://localhost:3000/docs`.

---

## Jalankan di Local

```bash
# 1. Clone & install
git clone <repo-url>
cd fin-techno
yarn install

# 2. Buat file .env
cp .env.example .env
# Edit .env sesuai konfigurasi kamu (lihat bagian Environment Variables)

# 3. Setup database
npx prisma migrate dev --name init

# 4. Jalankan dev server
yarn dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT & NextAuth
JWT_SECRET="random_string_minimal_32_karakter"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random_string_minimal_32_karakter"

# API Base URL
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"

# Opsional — Vercel Blob (file storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Opsional — QStash (async processing)
QSTASH_URL="..."
QSTASH_TOKEN="..."

# Opsional — Gemini AI (AI chat & analisis keuangan)
GEMINI_API_KEY=""

# Opsional — OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# Opsional — SMTP (kirim OTP email)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

Generate `JWT_SECRET` dan `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Tech Stack

Next.js 15 · TypeScript · PostgreSQL (Neon) · Prisma · JWT + NextAuth v4 · Zustand · ApexCharts · FullCalendar · Tailwind CSS · Vercel Blob · QStash · Gemini AI

---

## API Documentation

Dokumentasi API menggunakan **Swagger UI** (OpenAPI 3.0).

- Spec didefinisikan di `lib/openapi.ts`
- UI tersedia di `/docs`
- Untuk endpoint yang butuh auth: dapatkan token via `POST /api/auth/login`, lalu klik **Authorize** di Swagger UI dan masukkan token

### Endpoint Groups

| Tag | Deskripsi |
|-----|-----------|
| Auth | Register, login, OTP |
| Transactions | List & filter transaksi (bank + wallet) |
| Bank Accounts | CRUD rekening bank |
| Wallets | CRUD dompet digital |
| Categories | CRUD kategori transaksi |
| Upload | Submit & proses e-statement |
| Dashboard | Metrik, cashflow, ringkasan akun |
| Reports | Laporan pengeluaran, pemasukan, periode |
| Calendar | Data transaksi per tanggal/bulan |
| Notifications | List & SSE stream notifikasi |
| User | Profil & avatar |
| AI | Chat & analisis keuangan |

---

## Scripts

```bash
yarn dev      # development server
yarn build    # production build
yarn start    # production server
yarn lint     # ESLint
```

---

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan semua env vars di Vercel dashboard
4. Update `NEXTAUTH_URL` ke domain production
5. Update OAuth redirect URI di Google Console & Facebook Developers
