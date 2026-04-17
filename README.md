# Fin-Techno

Aplikasi manajemen keuangan pribadi berbasis web untuk upload, parsing, dan analisis e-statement bank dan dompet digital. Mendukung kategorisasi transaksi, kalender transaksi, dan laporan keuangan.

## Untuk Siapa Aplikasi Ini?

Fin-Techno cocok untuk:

- **Individu yang ingin memahami pola pengeluaran mereka** — upload e-statement dari bank atau dompet digital, lalu lihat ringkasan otomatis tanpa perlu input manual.
- **Pengguna multi-rekening** — yang punya lebih dari satu rekening bank atau dompet digital dan ingin melihat semua transaksi dalam satu tempat.
- **Orang yang ingin budgeting berbasis data nyata** — bukan estimasi, tapi berdasarkan histori transaksi aktual dari e-statement.
- **Pengguna bank Indonesia** — BRI, BCA, Mandiri, BNI, CIMB, dll, serta dompet digital seperti GoPay, OVO, DANA, ShopeePay.
- **Developer atau tech-savvy user** — yang nyaman self-host atau deploy sendiri ke Vercel dengan konfigurasi minimal.

Aplikasi ini **bukan** untuk bisnis atau akuntansi perusahaan — fokusnya pada keuangan pribadi.

---

## Tech Stack

- **Framework:** Next.js 15 (Pages Router) + TypeScript
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Auth:** JWT (email/password) + NextAuth v4 (Google, Facebook OAuth)
- **State:** Zustand + js-cookie
- **Charts:** ApexCharts
- **Calendar:** FullCalendar
- **Styling:** Tailwind CSS
- **Storage:** Vercel Blob
- **Queue:** QStash (Upstash)

## Fitur

- Upload e-statement bank (CSV, XLSX, PDF) — BRI, BCA, Mandiri, BNI, CIMB, dll
- Upload e-statement dompet digital — GoPay, OVO, DANA, ShopeePay, dll
- Parsing otomatis dengan deteksi duplikat (hash-based)
- Dashboard keuangan: metrik, cash flow, net flow, spending by category
- Kalender transaksi bulanan — klik hari untuk lihat list, klik transaksi untuk detail lengkap
- Halaman transaksi dengan month picker, filter, dan detail pop-up per transaksi
- Riwayat upload dengan detail per file
- Laporan pengeluaran & pemasukan per periode
- Manajemen kategori transaksi dengan auto-assign keyword
- Notifikasi real-time via SSE (Server-Sent Events)
- Login email/password + OAuth Google & Facebook

## URL

| Environment | URL |
|---|---|
| Local | http://localhost:3000 |
| Production | https://Fin-Technono.vercel.app |

---

## API Reference

Base URL:
- **Local:** `http://localhost:3000/api`
- **Vercel:** `https://Fin-Technono.vercel.app/api`

Semua endpoint (kecuali auth) memerlukan header:
```
Authorization: Bearer <token>
```

### Auth
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/auth/register` | Daftar akun baru |
| POST | `/auth/login` | Login, return JWT token |
| POST | `/auth/send-otp` | Kirim OTP ke email (`purpose`: login/register/change-password/oauth) |
| POST | `/auth/verify-otp` | Verifikasi OTP |

### User
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/user` | Ambil data user yang sedang login |
| GET | `/user/profile` | Ambil profil + statistik akun |
| PUT | `/user/profile` | Update nama atau ganti password |

### Dashboard
| Method | Endpoint | Query Params | Deskripsi |
|---|---|---|---|
| GET | `/dashboard/metrics` | `dateFrom`, `dateTo`, `accountId`, `accountType` | Metrik utama (income, expense, net flow, balance) |
| GET | `/dashboard/cashflow` | `dateFrom`, `dateTo`, `accountId`, `accountType`, `categoryId` | Data cash flow & net flow trend |
| GET | `/dashboard/accounts` | — | Daftar rekening + saldo terakhir |
| GET | `/dashboard/transactions` | `dateFrom`, `dateTo`, `accountId`, `accountType`, `categoryId`, `type`, `limit` | Transaksi terbaru + spending by category |

### Transactions
| Method | Endpoint | Query Params | Deskripsi |
|---|---|---|---|
| GET | `/transactions` | `dateFrom`, `dateTo`, `type`, `source`, `search`, `category`, `page`, `limit` | List semua transaksi dengan pagination |

### Calendar
| Method | Endpoint | Query Params | Deskripsi |
|---|---|---|---|
| GET | `/calendar` | `dateFrom`, `dateTo` | Ringkasan transaksi per hari + detail tiap transaksi (datetime, provider, kategori, dll) |

### Bank Accounts
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/bank-accounts` | List rekening bank |
| POST | `/bank-accounts` | Tambah rekening (`bankProvider`, `accountNumber`, `accountName`) |
| PUT | `/bank-accounts/:id` | Update rekening |
| DELETE | `/bank-accounts/:id` | Hapus rekening + semua data terkait |

### Wallets
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/wallets` | List dompet digital |
| POST | `/wallets` | Tambah dompet (`walletProvider`, `phoneNumber`, `accountName`) |
| PUT | `/wallets/:id` | Update dompet |
| DELETE | `/wallets/:id` | Hapus dompet (soft delete jika ada transaksi) |

### Categories
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/categories` | List kategori |
| POST | `/categories` | Buat kategori (`name`, `code`) — auto-assign ke transaksi yang cocok |
| PUT | `/categories/:id` | Update kategori |
| DELETE | `/categories/:id` | Hapus kategori |
| POST | `/categories/reassign` | Re-assign semua transaksi tanpa kategori |

### Upload
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/upload/list` | List semua upload |
| GET | `/upload/accounts` | Daftar rekening/dompet aktif untuk dipilih saat upload |
| POST | `/upload/submit` | Upload e-statement (multipart: `file`, `accountId`, `sourceType`) |
| POST | `/upload/process` | Proses parsing file yang sudah diupload |
| GET | `/upload/:id` | Detail upload |
| DELETE | `/upload/:id` | Hapus upload + transaksi terkait |

### Reports
| Method | Endpoint | Query Params | Deskripsi |
|---|---|---|---|
| GET | `/reports/expense` | `dateFrom`, `dateTo`, `accountId`, `accountType` | Laporan pengeluaran: trend, by category, by source |
| GET | `/reports/income` | `dateFrom`, `dateTo`, `accountId`, `accountType` | Laporan pemasukan: trend, by category, by source |
| GET | `/reports/period` | `dateFrom`, `dateTo`, `source` | Laporan lengkap per periode |

### Notifications
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/notifications` | List notifikasi |
| GET | `/notifications/stream` | SSE stream untuk notifikasi real-time |
| PATCH | `/notifications` | Tandai semua sudah dibaca |
| DELETE | `/notifications` | Hapus semua notifikasi |

---

## Postman

File collection dan environment tersedia di folder `postman/`:

```
postman/
├── finTech.postman_collection.json   # Semua endpoint
├── local.postman_environment.json      # baseUrl: localhost:3000
└── vercel.postman_environment.json     # baseUrl: dev-fintech.vercel.app
```

Import ke Postman:
1. **Import** → pilih `finTech.postman_collection.json`
2. **Import** → pilih environment yang diinginkan (`local` atau `vercel`)
3. Jalankan request **Login** — token JWT otomatis tersimpan ke variable `token`
4. Semua request lain akan otomatis menggunakan token tersebut

---

## Konfigurasi Awal

### 1. Clone & Install

```bash
git clone <repo-url>
cd fintech
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
│   ├── auth/              # SignInForm, SignUpForm, OtpInput, AuthLayout
│   ├── common/            # GridShape, PageBreadCrumb, PageMeta, ThemeToggle
│   ├── finance/           # Dashboard widgets: charts, metrics, transactions, filters
│   ├── form/              # Input, Select, Checkbox, DatePicker, MultiSelect, Switch
│   ├── header/            # NotificationDropdown, UserDropdown
│   ├── icons/             # SVG icons + provider icons (BankIcon, WalletIcon)
│   ├── layout/            # AppLayout, AppSidebar, AppHeader, Backdrop
│   ├── ui/                # Button, Modal, Toast, Table, Badge, Dropdown, Pagination
│   └── UserProfile/       # UserInfoCard, UserMetaCard, UserAddressCard
├── lib/
│   ├── auth.ts            # verifyToken helper
│   ├── db.ts              # Prisma client singleton
│   ├── mailer.ts          # Nodemailer setup untuk kirim OTP
│   ├── utils.ts           # Utility functions
│   ├── apexTooltip.ts     # Custom ApexCharts tooltip helper
│   ├── config/
│   │   └── menuConfig.ts  # Konfigurasi menu sidebar
│   ├── context/           # React context: Modal, Notification, Sidebar, Theme
│   ├── hooks/             # useModal, useToast, useDebounce
│   └── types/             # TypeScript types (dashboard, shared)
├── pages/
│   ├── api/               # API routes (Next.js)
│   │   ├── auth/          # login, register, send-otp, verify-otp, [...nextauth]
│   │   ├── bank-accounts/ # CRUD rekening bank
│   │   ├── wallets/       # CRUD dompet digital
│   │   ├── transactions/  # List transaksi dengan filter & pagination
│   │   ├── upload/        # submit, process, list, accounts, [id]
│   │   ├── dashboard/     # metrics, cashflow, accounts, transactions
│   │   ├── calendar/      # ringkasan transaksi per hari
│   │   ├── categories/    # CRUD kategori + reassign
│   │   ├── reports/       # expense, income, period
│   │   ├── notifications/ # list, stream (SSE), patch, delete
│   │   └── user/          # profile
│   ├── auth/              # login, register, change-password, oauth-callback
│   ├── bank-accounts/     # list + add rekening
│   ├── wallets/           # list dompet digital
│   ├── transactions/      # halaman transaksi dengan filter
│   ├── upload/            # upload e-statement
│   │   └── riwayat/       # riwayat upload: list + detail per file ([id])
│   ├── calendar/          # kalender transaksi bulanan
│   ├── categories/        # list + add kategori
│   ├── profile/           # halaman profil user
│   ├── signin/            # halaman sign in
│   ├── signup/            # halaman sign up
│   ├── _app.tsx           # App wrapper + providers
│   ├── _document.tsx      # Custom document
│   ├── index.tsx          # Dashboard utama
│   └── 404.tsx            # Halaman not found
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Riwayat migrasi database
├── services/
│   └── AxiosGlobal.ts     # Axios instance dengan interceptor token
├── store/
│   └── authStore.tsx      # Zustand store untuk auth state
├── styles/
│   └── globals.css        # Global CSS + Tailwind directives
├── public/
│   └── images/            # Logo, error pages, shapes
├── postman/               # Postman collection & environments
├── e-statement/           # Contoh file e-statement untuk testing
├── middleware.ts          # Route protection middleware
└── .env                   # Environment variables
```

---

## Scripts

```bash
yarn dev      # development server
yarn build    # production build (prisma generate + next build)
yarn start    # production server
yarn lint     # ESLint
```

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan semua environment variables dari `.env` di Vercel dashboard
4. Update `NEXTAUTH_URL` ke domain production
5. Update redirect URI di Google Console dan Facebook Developers ke domain production
