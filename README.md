# Fin-Techno

Aplikasi manajemen keuangan pribadi — upload e-statement bank & dompet digital, parsing otomatis, kategorisasi, dan analitik keuangan.

---

## Demo & Dokumentasi

| | URL |
|---|---|
| **Demo (Production)** | [https://fin-techno.vercel.app](https://fin-techno.vercel.app) |
| **Dokumentasi** | [https://fin-techno.vercel.app/docs](https://fin-techno.vercel.app/docs) |

> Halaman `/docs` bisa dibuka **tanpa login** — berisi flow aplikasi (FRD), penjelasan fitur, dan API reference lengkap dengan payload & response.
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

Next.js 15 · TypeScript · PostgreSQL (Neon) · Prisma · JWT + NextAuth v4 · Zustand · ApexCharts · FullCalendar · Tailwind CSS · Vercel Blob · QStash

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
