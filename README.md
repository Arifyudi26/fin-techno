# Fin-Techno

Aplikasi manajemen keuangan pribadi — upload e-statement bank & dompet digital, parsing otomatis, kategorisasi, dan analitik keuangan.

**Dokumentasi lengkap (flow, FRD, API reference):** [`/docs`](http://localhost:3000/docs)

---

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Buat file .env (lihat .env.example)
cp .env.example .env

# 3. Setup database
npx prisma migrate dev --name init

# 4. Jalankan dev server
yarn dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="random_string_minimal_32_karakter"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random_string_minimal_32_karakter"

# Opsional
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
QSTASH_URL="..."
QSTASH_TOKEN="..."
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

Generate secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Tech Stack

Next.js 15 · TypeScript · PostgreSQL (Neon) · Prisma · JWT + NextAuth v4 · Zustand · ApexCharts · FullCalendar · Tailwind CSS · Vercel Blob · QStash

## Deploy

Push ke GitHub → import di [vercel.com](https://vercel.com) → tambahkan env vars → update `NEXTAUTH_URL` dan OAuth redirect URI ke domain production.
