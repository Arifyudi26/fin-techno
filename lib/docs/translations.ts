export type Lang = "id" | "en";

export const t = {
  id: {
    // Layout
    nav: "Navigasi",
    baseUrl: "Base URL",

    // Nav labels
    navOverview: "Overview",
    navFlow: "App Flow (FRD)",
    navAuth: "Auth API",
    navDashboard: "Dashboard API",
    navTransactions: "Transactions API",
    navAccounts: "Bank & Wallet API",
    navUpload: "Upload API",
    navCategories: "Categories API",
    navReports: "Reports API",
    navCalendar: "Calendar API",
    navNotifications: "Notifications API",
    navUser: "User API",

    // Common
    authNote: "Semua endpoint memerlukan",
    publicNote: "Semua endpoint di bawah ini bersifat publik — tidak memerlukan token.",
    environment: "Environment",

    // Overview
    overviewTitle: "Overview",
    overviewDesc:
      "adalah aplikasi manajemen keuangan pribadi berbasis web. Upload e-statement dari bank atau dompet digital, dan aplikasi akan otomatis mem-parsing, mengkategorikan, serta menampilkan analitik keuangan kamu dalam satu dashboard.",
    techStack: "Tech Stack",
    authentication: "Authentication",
    authDesc: "Semua endpoint API (kecuali",
    authDesc2: ") memerlukan header:",
    features: [
      { title: "Upload E-Statement", desc: "CSV, XLSX, PDF dari BRI, BCA, Mandiri, BNI, CIMB, GoPay, OVO, DANA, ShopeePay" },
      { title: "Dashboard Keuangan", desc: "Metrik income, expense, net flow, cash flow trend, dan spending by category" },
      { title: "Kalender Transaksi", desc: "Lihat ringkasan harian, klik hari untuk detail transaksi" },
      { title: "Laporan Keuangan", desc: "Laporan pengeluaran & pemasukan per periode dengan breakdown kategori" },
      { title: "Manajemen Kategori", desc: "Buat kategori dengan auto-assign keyword ke transaksi yang cocok" },
      { title: "Multi-Rekening", desc: "Kelola beberapa rekening bank dan dompet digital sekaligus" },
    ],

    // Flow
    flowTitle: "App Flow (FRD)",
    flowDesc: "Functional Requirements Document — alur utama penggunaan aplikasi dari registrasi hingga analitik keuangan.",
    flowSections: [
      {
        subtitle: "1. Registrasi & Login",
        cards: [
          {
            label: "Email / Password",
            steps: [
              { title: "Daftar akun", desc: "User mengisi nama, email, dan password. Sistem mengirim OTP ke email untuk verifikasi." },
              { title: "Verifikasi OTP", desc: "User memasukkan kode 6 digit yang dikirim ke email (berlaku 5 menit). Setelah valid, akun dibuat dan JWT token dikembalikan." },
              { title: "Login", desc: "User memasukkan email + password. Sistem memvalidasi credentials, lalu mengirim OTP. Setelah OTP diverifikasi, JWT token dikembalikan dan disimpan di cookie." },
            ],
          },
          {
            label: "OAuth (Google / Facebook)",
            steps: [
              { title: "Klik Sign in with Google/Facebook", desc: "User diarahkan ke halaman OAuth provider." },
              { title: "Callback & upsert user", desc: "NextAuth menerima callback, mencari atau membuat user di database berdasarkan email." },
              { title: "Generate JWT", desc: "Sistem membuat JWT token internal, menyimpannya di session NextAuth." },
              { title: "Redirect ke /auth/oauth-callback", desc: "Frontend membaca session, menyimpan JWT ke cookie, lalu redirect ke dashboard." },
            ],
          },
        ],
      },
      {
        subtitle: "2. Setup Rekening",
        cards: [
          {
            label: null,
            steps: [
              { title: "Tambah rekening bank", desc: "User mendaftarkan rekening bank (provider, nomor rekening, nama). Satu nomor rekening hanya bisa didaftarkan sekali." },
              { title: "Tambah dompet digital", desc: "User mendaftarkan dompet digital (provider, nomor HP, nama akun)." },
              { title: "Rekening aktif", desc: "Rekening yang aktif akan muncul sebagai pilihan saat upload e-statement dan di filter dashboard." },
            ],
          },
        ],
      },
      {
        subtitle: "3. Upload E-Statement",
        cards: [
          {
            label: null,
            steps: [
              { title: "Pilih rekening & file", desc: "User memilih rekening/dompet tujuan, lalu upload file CSV, XLSX, atau PDF (maks 10MB)." },
              { title: "Cek duplikat", desc: "Sistem mengecek duplikat berdasarkan nama file dan hash konten file. Jika sudah ada, upload ditolak dengan kode DUPLICATE_FILENAME." },
              { title: "Simpan ke storage", desc: "File disimpan ke Vercel Blob. Record upload dibuat di database dengan status PENDING." },
              { title: "Parsing otomatis", desc: "Sistem mem-parsing file: deteksi kolom otomatis (tanggal, deskripsi, debit, kredit, saldo, referensi), konversi format tanggal, deteksi tipe transaksi (CREDIT/DEBIT)." },
              { title: "Auto-kategorisasi", desc: "Setiap transaksi dicocokkan dengan keyword dari kategori yang sudah dibuat user. Transaksi yang cocok langsung dikategorikan." },
              { title: "Notifikasi", desc: "Setelah selesai, notifikasi dikirim ke user via SSE (Server-Sent Events) dengan ringkasan: total baris, parsed, failed, total credit/debit." },
            ],
          },
        ],
      },
      {
        subtitle: "4. Dashboard & Analitik",
        cards: [
          {
            label: null,
            steps: [
              { title: "Filter periode & rekening", desc: "User bisa filter berdasarkan tanggal, rekening spesifik (bank/wallet), dan kategori." },
              { title: "Metrik utama", desc: "Tampil: total income, total expense, net flow, total balance, jumlah transaksi — beserta persentase perubahan vs periode sebelumnya." },
              { title: "Cash flow trend", desc: "Grafik bar income vs expense. Granularitas otomatis: per hari (≤31 hari), per minggu (≤92 hari), per bulan (>92 hari)." },
              { title: "Spending by category", desc: "Donut/bar chart pengeluaran dan pemasukan per kategori." },
              { title: "Transaksi terbaru", desc: "List transaksi terbaru dengan detail provider, kategori, dan status." },
            ],
          },
        ],
      },
      {
        subtitle: "5. Manajemen Kategori",
        cards: [
          {
            label: null,
            steps: [
              { title: "Buat kategori", desc: "User membuat kategori dengan nama dan kode unik (maks 5 karakter). Contoh: nama='Gaji Karyawan', kode='GAJI'." },
              { title: "Auto-assign", desc: "Setelah kategori dibuat, sistem otomatis mencari transaksi yang deskripsinya mengandung keyword dari nama kategori dan mengassign kategori tersebut." },
              { title: "Re-assign manual", desc: "User bisa trigger re-assign ulang semua transaksi tanpa kategori via POST /api/categories/reassign." },
            ],
          },
        ],
      },
      {
        subtitle: "6. Laporan Keuangan",
        cards: [
          {
            label: null,
            steps: [
              { title: "Pilih periode & filter", desc: "User memilih rentang tanggal, rekening, dan tipe sumber (bank/wallet)." },
              { title: "Laporan pengeluaran", desc: "Trend pengeluaran, breakdown per kategori, breakdown per sumber rekening, perbandingan vs periode sebelumnya." },
              { title: "Laporan pemasukan", desc: "Sama seperti pengeluaran tapi untuk transaksi CREDIT." },
              { title: "Laporan periode", desc: "Laporan gabungan income + expense + net flow untuk periode tertentu." },
            ],
          },
        ],
      },
      {
        subtitle: "7. Kalender Transaksi",
        cards: [
          {
            label: null,
            steps: [
              { title: "Tampilan kalender bulanan", desc: "Setiap hari yang ada transaksi menampilkan ringkasan: total credit, total debit, jumlah transaksi." },
              { title: "Detail per hari", desc: "Klik hari untuk melihat list transaksi lengkap pada hari tersebut (via GET /api/calendar/[date])." },
              { title: "Timezone WIB", desc: "Semua tanggal dikonversi ke WIB (UTC+7) untuk pengelompokan yang akurat." },
            ],
          },
        ],
      },
    ],
    middlewareTitle: "Middleware & Proteksi Route",
    publicPages: "Halaman Publik (tanpa login)",
    publicApis: "API Publik (tanpa token)",
    middlewareNote: "Semua halaman lain redirect ke /auth/login jika tidak ada cookie",
    middlewareNote2: ". Semua API lain wajib header",

    // API pages — endpoint descriptions
    api: {
      authPublicNote: "Semua endpoint di bawah ini bersifat publik — tidak memerlukan token.",
      authRequired: "Semua endpoint memerlukan",

      // Auth
      registerDesc: "Daftar akun baru langsung (tanpa OTP). Mengembalikan JWT token.",
      loginDesc: "Login dengan email dan password. Mengembalikan JWT token. Tambahkan checkOnly: true untuk validasi credentials saja tanpa token (digunakan sebelum flow OTP).",
      sendOtpDesc: "Kirim kode OTP 6 digit ke email. OTP berlaku 5 menit. Purpose menentukan konteks penggunaan.",
      verifyOtpDesc: "Verifikasi kode OTP. Behavior berbeda tergantung purpose: register → buat user baru; login/oauth → return token; change-password → update password.",
      nextauthDesc: "NextAuth handler untuk OAuth Google dan Facebook. Digunakan secara internal oleh NextAuth — tidak dipanggil langsung.",

      // Dashboard
      metricsDesc: "Metrik utama dashboard: total income, expense, net flow, balance, jumlah transaksi, dan persentase perubahan vs periode sebelumnya. Jika tidak ada filter tanggal, otomatis menggunakan bulan dari transaksi terbaru.",
      cashflowDesc: "Data cash flow (credit vs debit) dan net flow trend. Granularitas otomatis: per hari (≤31 hari), per minggu (≤92 hari), per bulan (>92 hari).",
      dashAccountsDesc: "Daftar semua rekening bank dan dompet digital aktif milik user, beserta saldo terakhir dari transaksi terbaru.",
      dashTxDesc: "Transaksi terbaru + spending by category + income by category. Digunakan untuk widget di dashboard.",

      // Transactions
      txListDesc: "List semua transaksi (bank + wallet) dengan pagination, filter, dan summary. Menggunakan single UNION ALL query untuk performa optimal.",

      // Bank accounts
      bankListDesc: "List semua rekening bank milik user beserta statistik: total upload, total transaksi, total credit/debit, dan info upload terakhir.",
      bankAddDesc: "Tambah rekening bank baru. Nomor rekening harus unik.",
      bankUpdateDesc: "Update data rekening bank (nama, deskripsi, status aktif).",
      bankDeleteDesc: "Hapus rekening bank beserta semua transaksi dan upload terkait.",
      bankAccountsSubtitle: "Bank Accounts",
      walletsSubtitle: "Digital Wallets",
      walletListDesc: "List semua dompet digital milik user beserta statistik transaksi.",
      walletAddDesc: "Tambah dompet digital baru.",
      walletUpdateDesc: "Update data dompet digital.",
      walletDeleteDesc: "Hapus dompet digital. Soft delete jika ada transaksi terkait (isActive = false), hard delete jika tidak ada transaksi.",

      // Upload
      uploadListDesc: "List semua riwayat upload (bank + wallet) milik user, diurutkan dari terbaru.",
      uploadAccountsDesc: "Daftar rekening bank dan dompet digital aktif milik user — digunakan sebagai pilihan saat upload.",
      uploadSubmitDesc: "Upload file e-statement. Request harus menggunakan multipart/form-data. File maks 10MB. Format yang didukung: CSV, XLSX, XLS, PDF. Sistem otomatis mem-parsing file setelah upload.",
      uploadDetailDesc: "Detail satu upload berdasarkan ID, termasuk list transaksi yang berhasil di-parse.",
      uploadDeleteDesc: "Hapus upload beserta semua transaksi yang terkait dengan upload tersebut.",

      // Categories
      catListDesc: "List semua kategori milik user beserta jumlah transaksi yang sudah dikategorikan.",
      catAddDesc: "Buat kategori baru. Kode harus unik per user (maks 5 karakter, otomatis uppercase). Setelah dibuat, sistem otomatis mengassign kategori ke transaksi yang deskripsinya mengandung keyword dari nama kategori.",
      catUpdateDesc: "Update nama, kode, atau deskripsi kategori.",
      catDeleteDesc: "Hapus kategori. Transaksi yang sudah dikategorikan akan kehilangan kategori ini.",
      catReassignDesc: "Re-assign semua transaksi yang belum memiliki kategori berdasarkan keyword dari semua kategori yang ada. Berguna setelah menambah kategori baru.",

      // Reports
      expenseDesc: "Laporan pengeluaran (transaksi DEBIT) untuk periode tertentu. Granularitas trend otomatis: per hari/minggu/bulan. Default: seluruh tahun berjalan.",
      incomeDesc: "Laporan pemasukan (transaksi CREDIT). Struktur response sama dengan /reports/expense, dengan field bestPeriod (bukan highestPeriod).",
      periodDesc: "Laporan gabungan per periode: income, expense, net flow, dan breakdown per sumber.",

      // Calendar
      calendarDesc: "Ringkasan transaksi per hari untuk rentang tanggal tertentu. Semua tanggal dikonversi ke WIB (UTC+7). Digunakan untuk render kalender bulanan.",
      calendarDateDesc: "Detail semua transaksi pada tanggal tertentu (format YYYY-MM-DD). Digunakan saat user klik hari di kalender.",

      // Notifications
      notifListDesc: "List 50 notifikasi terbaru milik user beserta jumlah yang belum dibaca.",
      notifAddDesc: "Buat notifikasi baru (digunakan secara internal oleh sistem setelah proses upload).",
      notifPatchDesc: "Tandai semua notifikasi sebagai sudah dibaca.",
      notifDeleteDesc: "Hapus semua notifikasi milik user.",
      notifStreamDesc: "Server-Sent Events (SSE) stream untuk notifikasi real-time. Karena EventSource tidak bisa mengirim header, token dikirim via query param.",

      // User
      userGetDesc: "Ambil data profil user yang sedang login beserta statistik akun: jumlah rekening bank, dompet, upload, dan transaksi.",
      userUpdateDesc: "Update nama atau ganti password. Untuk ganti password, currentPassword wajib diisi dan divalidasi.",
      userAvatarDesc: "Upload foto profil. Request menggunakan multipart/form-data. File disimpan ke Vercel Blob.",
    },
  },

  en: {
    nav: "Navigation",
    baseUrl: "Base URL",

    navOverview: "Overview",
    navFlow: "App Flow (FRD)",
    navAuth: "Auth API",
    navDashboard: "Dashboard API",
    navTransactions: "Transactions API",
    navAccounts: "Bank & Wallet API",
    navUpload: "Upload API",
    navCategories: "Categories API",
    navReports: "Reports API",
    navCalendar: "Calendar API",
    navNotifications: "Notifications API",
    navUser: "User API",

    authNote: "All endpoints require",
    publicNote: "All endpoints below are public — no token required.",
    environment: "Environment",

    overviewTitle: "Overview",
    overviewDesc:
      "is a web-based personal finance management app. Upload e-statements from your bank or digital wallet, and the app will automatically parse, categorize, and display your financial analytics in one dashboard.",
    techStack: "Tech Stack",
    authentication: "Authentication",
    authDesc: "All API endpoints (except",
    authDesc2: ") require the header:",
    features: [
      { title: "Upload E-Statement", desc: "CSV, XLSX, PDF from BRI, BCA, Mandiri, BNI, CIMB, GoPay, OVO, DANA, ShopeePay" },
      { title: "Finance Dashboard", desc: "Income, expense, net flow, cash flow trend, and spending by category metrics" },
      { title: "Transaction Calendar", desc: "View daily summaries, click a day to see transaction details" },
      { title: "Financial Reports", desc: "Expense & income reports per period with category breakdown" },
      { title: "Category Management", desc: "Create categories with auto-assign keywords to matching transactions" },
      { title: "Multi-Account", desc: "Manage multiple bank accounts and digital wallets at once" },
    ],

    flowTitle: "App Flow (FRD)",
    flowDesc: "Functional Requirements Document — main application flow from registration to financial analytics.",
    flowSections: [
      {
        subtitle: "1. Registration & Login",
        cards: [
          {
            label: "Email / Password",
            steps: [
              { title: "Register account", desc: "User fills in name, email, and password. System sends OTP to email for verification." },
              { title: "Verify OTP", desc: "User enters the 6-digit code sent to email (valid for 5 minutes). Once valid, account is created and JWT token is returned." },
              { title: "Login", desc: "User enters email + password. System validates credentials, then sends OTP. After OTP verification, JWT token is returned and stored in cookie." },
            ],
          },
          {
            label: "OAuth (Google / Facebook)",
            steps: [
              { title: "Click Sign in with Google/Facebook", desc: "User is redirected to the OAuth provider page." },
              { title: "Callback & upsert user", desc: "NextAuth receives callback, finds or creates user in database by email." },
              { title: "Generate JWT", desc: "System creates internal JWT token, stores it in NextAuth session." },
              { title: "Redirect to /auth/oauth-callback", desc: "Frontend reads session, saves JWT to cookie, then redirects to dashboard." },
            ],
          },
        ],
      },
      {
        subtitle: "2. Account Setup",
        cards: [
          {
            label: null,
            steps: [
              { title: "Add bank account", desc: "User registers a bank account (provider, account number, name). Each account number can only be registered once." },
              { title: "Add digital wallet", desc: "User registers a digital wallet (provider, phone number, account name)." },
              { title: "Active accounts", desc: "Active accounts will appear as options when uploading e-statements and in dashboard filters." },
            ],
          },
        ],
      },
      {
        subtitle: "3. Upload E-Statement",
        cards: [
          {
            label: null,
            steps: [
              { title: "Select account & file", desc: "User selects target account/wallet, then uploads CSV, XLSX, or PDF file (max 10MB)." },
              { title: "Duplicate check", desc: "System checks for duplicates by filename and file content hash. If already exists, upload is rejected with DUPLICATE_FILENAME code." },
              { title: "Save to storage", desc: "File is saved to Vercel Blob. Upload record is created in database with PENDING status." },
              { title: "Auto parsing", desc: "System parses the file: auto-detects columns (date, description, debit, credit, balance, reference), converts date formats, detects transaction type (CREDIT/DEBIT)." },
              { title: "Auto-categorization", desc: "Each transaction is matched against keywords from user-created categories. Matching transactions are immediately categorized." },
              { title: "Notification", desc: "After completion, notification is sent to user via SSE (Server-Sent Events) with summary: total rows, parsed, failed, total credit/debit." },
            ],
          },
        ],
      },
      {
        subtitle: "4. Dashboard & Analytics",
        cards: [
          {
            label: null,
            steps: [
              { title: "Filter period & account", desc: "User can filter by date, specific account (bank/wallet), and category." },
              { title: "Key metrics", desc: "Shows: total income, total expense, net flow, total balance, transaction count — with percentage change vs previous period." },
              { title: "Cash flow trend", desc: "Bar chart of income vs expense. Auto granularity: per day (≤31 days), per week (≤92 days), per month (>92 days)." },
              { title: "Spending by category", desc: "Donut/bar chart of expenses and income per category." },
              { title: "Recent transactions", desc: "List of recent transactions with provider, category, and status details." },
            ],
          },
        ],
      },
      {
        subtitle: "5. Category Management",
        cards: [
          {
            label: null,
            steps: [
              { title: "Create category", desc: "User creates a category with a unique name and code (max 5 chars). Example: name='Employee Salary', code='SALARY'." },
              { title: "Auto-assign", desc: "After category is created, system automatically finds transactions whose description contains keywords from the category name and assigns the category." },
              { title: "Manual re-assign", desc: "User can trigger re-assignment of all uncategorized transactions via POST /api/categories/reassign." },
            ],
          },
        ],
      },
      {
        subtitle: "6. Financial Reports",
        cards: [
          {
            label: null,
            steps: [
              { title: "Select period & filter", desc: "User selects date range, account, and source type (bank/wallet)." },
              { title: "Expense report", desc: "Expense trend, breakdown by category, breakdown by account source, comparison vs previous period." },
              { title: "Income report", desc: "Same as expense report but for CREDIT transactions." },
              { title: "Period report", desc: "Combined income + expense + net flow report for a specific period." },
            ],
          },
        ],
      },
      {
        subtitle: "7. Transaction Calendar",
        cards: [
          {
            label: null,
            steps: [
              { title: "Monthly calendar view", desc: "Each day with transactions shows a summary: total credit, total debit, transaction count." },
              { title: "Daily detail", desc: "Click a day to see the full transaction list for that day (via GET /api/calendar/[date])." },
              { title: "WIB Timezone", desc: "All dates are converted to WIB (UTC+7) for accurate grouping." },
            ],
          },
        ],
      },
    ],
    middlewareTitle: "Middleware & Route Protection",
    publicPages: "Public Pages (no login required)",
    publicApis: "Public APIs (no token required)",
    middlewareNote: "All other pages redirect to /auth/login if no",
    middlewareNote2: "cookie. All other APIs require header",

    api: {
      authPublicNote: "All endpoints below are public — no token required.",
      authRequired: "All endpoints require",

      registerDesc: "Register a new account directly (without OTP). Returns JWT token.",
      loginDesc: "Login with email and password. Returns JWT token. Add checkOnly: true to validate credentials only without token (used before OTP flow).",
      sendOtpDesc: "Send a 6-digit OTP code to email. OTP is valid for 5 minutes. Purpose determines the usage context.",
      verifyOtpDesc: "Verify OTP code. Behavior differs by purpose: register → create new user; login/oauth → return token; change-password → update password.",
      nextauthDesc: "NextAuth handler for Google and Facebook OAuth. Used internally by NextAuth — not called directly.",

      metricsDesc: "Main dashboard metrics: total income, expense, net flow, balance, transaction count, and percentage change vs previous period. If no date filter, automatically uses the month of the latest transaction.",
      cashflowDesc: "Cash flow data (credit vs debit) and net flow trend. Auto granularity: per day (≤31 days), per week (≤92 days), per month (>92 days).",
      dashAccountsDesc: "List of all active bank accounts and digital wallets owned by the user, with the latest balance from the most recent transaction.",
      dashTxDesc: "Recent transactions + spending by category + income by category. Used for dashboard widgets.",

      txListDesc: "List all transactions (bank + wallet) with pagination, filters, and summary. Uses a single UNION ALL query for optimal performance.",

      bankListDesc: "List all bank accounts owned by the user with statistics: total uploads, total transactions, total credit/debit, and last upload info.",
      bankAddDesc: "Add a new bank account. Account number must be unique.",
      bankUpdateDesc: "Update bank account data (name, description, active status).",
      bankDeleteDesc: "Delete bank account along with all related transactions and uploads.",
      bankAccountsSubtitle: "Bank Accounts",
      walletsSubtitle: "Digital Wallets",
      walletListDesc: "List all digital wallets owned by the user with transaction statistics.",
      walletAddDesc: "Add a new digital wallet.",
      walletUpdateDesc: "Update digital wallet data.",
      walletDeleteDesc: "Delete digital wallet. Soft delete if there are related transactions (isActive = false), hard delete if no transactions.",

      uploadListDesc: "List all upload history (bank + wallet) owned by the user, sorted by most recent.",
      uploadAccountsDesc: "List of active bank accounts and digital wallets owned by the user — used as options when uploading.",
      uploadSubmitDesc: "Upload an e-statement file. Request must use multipart/form-data. Max file size 10MB. Supported formats: CSV, XLSX, XLS, PDF. System automatically parses the file after upload.",
      uploadDetailDesc: "Detail of a single upload by ID, including list of successfully parsed transactions.",
      uploadDeleteDesc: "Delete upload along with all transactions associated with that upload.",

      catListDesc: "List all categories owned by the user with the number of categorized transactions.",
      catAddDesc: "Create a new category. Code must be unique per user (max 5 chars, auto uppercase). After creation, system automatically assigns the category to transactions whose description contains keywords from the category name.",
      catUpdateDesc: "Update category name, code, or description.",
      catDeleteDesc: "Delete category. Transactions that were categorized will lose this category.",
      catReassignDesc: "Re-assign all uncategorized transactions based on keywords from all existing categories. Useful after adding new categories.",

      expenseDesc: "Expense report (DEBIT transactions) for a specific period. Auto trend granularity: per day/week/month. Default: entire current year.",
      incomeDesc: "Income report (CREDIT transactions). Response structure same as /reports/expense, with bestPeriod field (instead of highestPeriod).",
      periodDesc: "Combined period report: income, expense, net flow, and breakdown by source.",

      calendarDesc: "Daily transaction summary for a date range. All dates converted to WIB (UTC+7). Used to render the monthly calendar.",
      calendarDateDesc: "Detail of all transactions on a specific date (format YYYY-MM-DD). Used when user clicks a day in the calendar.",

      notifListDesc: "List the 50 most recent notifications for the user with unread count.",
      notifAddDesc: "Create a new notification (used internally by the system after upload processing).",
      notifPatchDesc: "Mark all notifications as read.",
      notifDeleteDesc: "Delete all notifications for the user.",
      notifStreamDesc: "Server-Sent Events (SSE) stream for real-time notifications. Since EventSource cannot send headers, token is sent via query param.",

      userGetDesc: "Get the logged-in user's profile data with account statistics: bank account count, wallet count, upload count, and transaction count.",
      userUpdateDesc: "Update name or change password. To change password, currentPassword is required and validated.",
      userAvatarDesc: "Upload profile photo. Request uses multipart/form-data. File is saved to Vercel Blob.",
    },
  },
} as const;

export type Translations = typeof t.id;
