# MyFinance

Aplikasi manajemen keuangan pribadi berbasis web untuk upload, parsing, dan analisis e-statement bank dan dompet digital. Mendukung rekonsiliasi multi-rekening, kategorisasi transaksi, dan laporan keuangan.

## Tech Stack

- **Framework:** Next.js 15 (Pages Router) + TypeScript
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Auth:** JWT (email/password) + NextAuth v4 (Google, Facebook OAuth)
- **State:** Zustand + js-cookie
- **Charts:** ApexCharts
- **Styling:** Tailwind CSS
- **Storage:** Vercel Blob
- **Queue:** QStash (Upstash)

## Fitur

- Upload e-statement bank (CSV, XLSX, PDF) — BRI, BCA, Mandiri, BNI, CIMB, dll
- Upload e-statement dompet digital — GoPay, OVO, DANA, ShopeePay, dll
- Parsing otomatis dengan deteksi duplikat (hash-based)
- Dashboard keuangan: metrik, cash flow, net flow, spending by category
- Laporan pengeluaran & pemasukan per periode
- Rekonsiliasi multi-rekening (merge report)
- Manajemen kategori transaksi
- Login email/password + OAuth Google & Facebook

---

## Konfigurasi Awal

### 1. Clone & Install

```bash
git clone <repo-url>
cd myfinance
yarn install
```

### 2. Environment Variables

Buat file `.env` di root project:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT
JWT_SECRET="random_string_minimal_32_karakter"

# API Base URL
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"

# Vercel Blob (opsional, untuk file storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# QStash (opsional, untuk async processing)
QSTASH_URL="https://qstash-us-east-1.upstash.io"
QSTASH_TOKEN="..."
QSTASH_CURRENT_SIGNING_KEY="..."
QSTASH_NEXT_SIGNING_KEY="..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random_string_minimal_32_karakter"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Facebook OAuth
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
```

Generate `NEXTAUTH_SECRET` dan `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Setup Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Seed data awal (opsional):

```bash
yarn seed
```

### 4. Jalankan Dev Server

```bash
yarn dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Setup OAuth

### Google

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru atau pilih yang sudah ada
3. Pergi ke **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Tambahkan Authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   Untuk production:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```
6. Copy **Client ID** dan **Client Secret** ke `.env`:
   ```env
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```

### Facebook

1. Buka [Facebook Developers](https://developers.facebook.com)
2. Buat app baru, pilih type **Consumer**
3. Tambahkan produk **Facebook Login**
4. Pergi ke **Facebook Login → Settings**
5. Tambahkan Valid OAuth Redirect URI:
   ```
   http://localhost:3000/api/auth/callback/facebook
   ```
   Untuk production:
   ```
   https://yourdomain.com/api/auth/callback/facebook
   ```
6. Copy **App ID** dan **App Secret** ke `.env`:
   ```env
   FACEBOOK_CLIENT_ID="..."
   FACEBOOK_CLIENT_SECRET="..."
   ```

> Facebook provider hanya aktif jika kedua variabel diisi. Jika kosong, tombol Sign in with Facebook tidak akan muncul di flow OAuth.

---

## Auth Flow

### Email / Password

```
POST /api/auth/login  →  JWT token  →  disimpan di cookie "token" + Zustand store
```

### OAuth (Google / Facebook)

```
Klik button  →  signIn(provider)  →  /api/auth/callback/[provider]
→  NextAuth signIn callback: cari/buat user di DB, generate JWT
→  redirect ke /auth/oauth-callback
→  baca session, simpan JWT ke cookie + Zustand store
→  redirect ke /
```

### Middleware

Semua route dilindungi middleware di `middleware.ts`:
- Route publik (tanpa login): `/auth/login`, `/auth/register`, `/auth/oauth-callback`
- API publik (tanpa token): `/api/auth/*`
- Semua API lain wajib header `Authorization: Bearer <token>`
- Semua page lain redirect ke `/auth/login` jika tidak ada cookie `token`

---

## Struktur Project

```
├── components/
│   ├── auth/          # SignInForm, SignUpForm, AuthLayout
│   ├── finance/       # Dashboard widgets (charts, metrics, transactions)
│   ├── form/          # Input, Select, Checkbox, dll
│   ├── layout/        # AppLayout, Sidebar, Header
│   └── ui/            # Button, Modal, Toast, Table, dll
├── lib/
│   ├── auth.ts        # verifyToken helper
│   ├── db.ts          # Prisma client
│   ├── hooks/         # useModal, useToast
│   └── types/         # TypeScript types
├── pages/
│   ├── api/           # API routes
│   │   ├── auth/      # login, register, [...nextauth]
│   │   ├── bank-accounts/
│   │   ├── wallets/
│   │   ├── transactions/
│   │   ├── upload/
│   │   ├── dashboard/
│   │   ├── categories/
│   │   ├── reconciliation/
│   │   └── reports/
│   ├── auth/          # login, register, oauth-callback
│   ├── bank-accounts/
│   ├── wallets/
│   ├── transactions/
│   ├── upload/
│   ├── categories/
│   ├── reconciliation/
│   └── reports/
├── prisma/
│   └── schema.prisma
├── store/
│   └── authStore.tsx  # Zustand auth state
├── middleware.ts
└── .env
```

---

## Scripts

```bash
yarn dev      # development server
yarn build    # production build
yarn start    # production server
yarn lint     # ESLint
yarn seed     # seed database
```

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan semua environment variables dari `.env` di Vercel dashboard
4. Update `NEXTAUTH_URL` ke domain production
5. Update redirect URI di Google Console dan Facebook Developers ke domain production
