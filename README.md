# Fin-Techno

Aplikasi manajemen keuangan pribadi — upload e-statement bank & dompet digital, parsing otomatis, kategorisasi, analitik keuangan, dan AI financial assistant berbasis Gemini.

---

## Demo & Dokumentasi API

| | URL |
|---|---|
| **Demo (Production)** | [https://fin-techno.vercel.app](https://fin-techno.vercel.app) |
| **API Docs (Swagger)** | [https://fin-techno.vercel.app/docs](https://fin-techno.vercel.app/docs) |

> Halaman `/docs` berisi **Swagger UI** — dokumentasi interaktif seluruh REST API.  
> Untuk mencoba endpoint yang butuh auth, klik **Authorize** dan masukkan JWT token dari `POST /api/auth/login`.

---

## Jalankan di Local

```bash
# 1. Clone & install
git clone <repo-url>
cd fin-techno
yarn install

# 2. Buat file .env
cp .env.example .env
# Edit .env sesuai konfigurasi (lihat bagian Environment Variables)

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

# Telegram Bot
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME=""
TELEGRAM_WEBHOOK_SECRET=""
```

Generate `JWT_SECRET` dan `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Tech Stack

Next.js 15 · TypeScript · PostgreSQL (Neon) · Prisma · JWT + NextAuth v4 · Zustand · ApexCharts · FullCalendar · Tailwind CSS · Vercel Blob · QStash · Gemini AI · Telegram Bot API

---

## Scripts

```bash
yarn dev       # development server
yarn build     # production build
yarn start     # production server
yarn lint      # ESLint
yarn telegram  # Telegram bot polling untuk development lokal (lihat bawah)
```

---

## API Documentation

Dokumentasi API menggunakan **Swagger UI** (OpenAPI 3.0), spec didefinisikan di `lib/openapi.ts`.

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
| Telegram | Link akun, webhook, admin panel |

---

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan semua env vars di Vercel dashboard
4. Set `NEXTAUTH_URL` ke domain production (contoh: `https://fin-techno.vercel.app`)
5. Update OAuth redirect URI di Google Console & Facebook Developers
6. Setelah deploy, daftarkan webhook Telegram (lihat bagian di bawah)

---

## Telegram Bot

Bot Telegram terintegrasi dengan aplikasi — akses data keuangan dan AI asisten langsung dari Telegram, gratis, berjalan di Vercel Serverless Functions.

### Fitur Bot

| Perintah | Fungsi |
|----------|--------|
| `/start <token>` | Hubungkan akun (token dari halaman Profil) |
| `/ringkasan` | Ringkasan pemasukan & pengeluaran bulan ini |
| `/transaksi` | 5 transaksi terakhir |
| `/tanya <pertanyaan>` | Tanya ke AI asisten keuangan (Gemini) |
| `/analisis` | Analisis keuangan lengkap oleh AI |
| `/disconnect` | Putuskan koneksi akun dari bot |
| `/help` | Daftar semua perintah |
| Pesan bebas | Otomatis diteruskan ke AI asisten |

---

### Setup Telegram Bot

#### 1. Buat Bot via BotFather

1. Buka Telegram → cari **@BotFather**
2. Ketik `/newbot`, ikuti instruksi
3. Pilih nama dan username (username harus diakhiri `bot`, contoh: `fin_techno_bot`)
4. Salin **token** yang diberikan

#### 2. Set Environment Variables

Tambahkan ke `.env` (lokal) dan Vercel Dashboard (production):

```env
TELEGRAM_BOT_TOKEN="123456789:AAHdqTcvCH1vGWJx..."
TELEGRAM_BOT_USERNAME="fin_techno_bot"
TELEGRAM_WEBHOOK_SECRET="random_string_bebas"
```

#### 3. Daftarkan Webhook (production, setelah deploy)

Login dengan akun **admin** → buka halaman **Profil** → di bagian **Panel Administrator** klik tombol **Daftarkan Webhook**.

Atau via Swagger UI: `POST /api/telegram/webhook-status` dengan JWT admin.

> **Catatan:** Webhook hanya bisa didaftarkan ke URL HTTPS production, bukan localhost.

#### 4. Hubungkan Akun User

1. Buka halaman **Profil** di web app
2. Klik **Hubungkan Telegram** → muncul tombol deep link
3. Klik tombol → Telegram terbuka dan akun langsung terhubung
4. Bot kirim pesan konfirmasi + daftar perintah

---

### Development Lokal (Telegram Bot)

Webhook Telegram butuh URL HTTPS public — tidak bisa langsung di localhost. Gunakan polling script yang sudah disediakan:

```bash
# Terminal 1 — Next.js dev server
yarn dev

# Terminal 2 — Telegram bot polling
yarn telegram
```

Script `yarn telegram` akan otomatis:
1. Menghapus webhook yang terdaftar di Telegram
2. Polling ke Telegram API setiap 1 detik
3. Me-forward setiap pesan ke `http://localhost:3000/api/telegram/webhook`

Kirim pesan ke bot di Telegram → langsung respons dari server lokal.

> **Sebelum deploy ke production:** stop polling script dan daftarkan ulang webhook via admin panel.

---

### Troubleshooting Telegram

**Bot tidak merespons setelah deploy**
- Pastikan webhook sudah terdaftar via admin panel di halaman Profil
- Cek status webhook di `GET /api/telegram/webhook-status` (Swagger, login admin)
- Pastikan `TELEGRAM_BOT_TOKEN` dan `NEXTAUTH_URL` sudah benar di Vercel

**Bot tidak merespons di local**
- Pastikan `yarn telegram` sedang jalan di terminal terpisah
- Pastikan `yarn dev` jalan di port 3000
- Cek console Next.js untuk error

**Akun tidak bisa terhubung**
- Generate ulang token via tombol "Hubungkan Telegram" di halaman Profil
- Token hanya berlaku sekali dan expired jika di-generate ulang

**Error "GEMINI_API_KEY is not configured"**
- Tambahkan `GEMINI_API_KEY` di `.env` atau Vercel Dashboard
- API key gratis tersedia di [Google AI Studio](https://aistudio.google.com/app/apikey)
