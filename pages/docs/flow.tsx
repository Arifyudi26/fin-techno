import DocLayout from "@/components/docs/DocLayout";
import { SectionTitle, SubTitle, FlowStep } from "@/components/docs/shared";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    {children}
  </div>
);

export default function DocsFlow() {
  return (
    <DocLayout title="App Flow (FRD)">
      <SectionTitle>App Flow (FRD)</SectionTitle>
      <p className="text-gray-600 mb-6 dark:text-gray-400">
        Functional Requirements Document — alur utama penggunaan aplikasi dari registrasi hingga
        analitik keuangan.
      </p>

      <SubTitle>1. Registrasi & Login</SubTitle>
      <Card className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3 dark:text-gray-200">Email / Password</p>
        <FlowStep num={1} title="Daftar akun" desc="User mengisi nama, email, dan password. Sistem mengirim OTP ke email untuk verifikasi." />
        <FlowStep num={2} title="Verifikasi OTP" desc="User memasukkan kode 6 digit yang dikirim ke email (berlaku 5 menit). Setelah valid, akun dibuat dan JWT token dikembalikan." />
        <FlowStep num={3} title="Login" desc="User memasukkan email + password. Sistem memvalidasi credentials, lalu mengirim OTP. Setelah OTP diverifikasi, JWT token dikembalikan dan disimpan di cookie." />
      </Card>
      <Card className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3 dark:text-gray-200">OAuth (Google / Facebook)</p>
        <FlowStep num={1} title="Klik Sign in with Google/Facebook" desc="User diarahkan ke halaman OAuth provider." />
        <FlowStep num={2} title="Callback & upsert user" desc="NextAuth menerima callback, mencari atau membuat user di database berdasarkan email." />
        <FlowStep num={3} title="Generate JWT" desc="Sistem membuat JWT token internal, menyimpannya di session NextAuth." />
        <FlowStep num={4} title="Redirect ke /auth/oauth-callback" desc="Frontend membaca session, menyimpan JWT ke cookie, lalu redirect ke dashboard." />
      </Card>

      <SubTitle>2. Setup Rekening</SubTitle>
      <Card className="mb-6">
        <FlowStep num={1} title="Tambah rekening bank" desc="User mendaftarkan rekening bank (provider, nomor rekening, nama). Satu nomor rekening hanya bisa didaftarkan sekali." />
        <FlowStep num={2} title="Tambah dompet digital" desc="User mendaftarkan dompet digital (provider, nomor HP, nama akun)." />
        <FlowStep num={3} title="Rekening aktif" desc="Rekening yang aktif akan muncul sebagai pilihan saat upload e-statement dan di filter dashboard." />
      </Card>

      <SubTitle>3. Upload E-Statement</SubTitle>
      <Card className="mb-6">
        <FlowStep num={1} title="Pilih rekening & file" desc="User memilih rekening/dompet tujuan, lalu upload file CSV, XLSX, atau PDF (maks 10MB)." />
        <FlowStep num={2} title="Cek duplikat" desc="Sistem mengecek duplikat berdasarkan nama file dan hash konten file. Jika sudah ada, upload ditolak dengan kode DUPLICATE_FILENAME." />
        <FlowStep num={3} title="Simpan ke storage" desc="File disimpan ke Vercel Blob. Record upload dibuat di database dengan status PENDING." />
        <FlowStep num={4} title="Parsing otomatis" desc="Sistem mem-parsing file: deteksi kolom otomatis (tanggal, deskripsi, debit, kredit, saldo, referensi), konversi format tanggal, deteksi tipe transaksi (CREDIT/DEBIT)." />
        <FlowStep num={5} title="Auto-kategorisasi" desc="Setiap transaksi dicocokkan dengan keyword dari kategori yang sudah dibuat user. Transaksi yang cocok langsung dikategorikan." />
        <FlowStep num={6} title="Notifikasi" desc="Setelah selesai, notifikasi dikirim ke user via SSE (Server-Sent Events) dengan ringkasan: total baris, parsed, failed, total credit/debit." />
      </Card>

      <SubTitle>4. Dashboard & Analitik</SubTitle>
      <Card className="mb-6">
        <FlowStep num={1} title="Filter periode & rekening" desc="User bisa filter berdasarkan tanggal, rekening spesifik (bank/wallet), dan kategori." />
        <FlowStep num={2} title="Metrik utama" desc="Tampil: total income, total expense, net flow, total balance, jumlah transaksi — beserta persentase perubahan vs periode sebelumnya." />
        <FlowStep num={3} title="Cash flow trend" desc="Grafik bar income vs expense. Granularitas otomatis: per hari (≤31 hari), per minggu (≤92 hari), per bulan (>92 hari)." />
        <FlowStep num={4} title="Spending by category" desc="Donut/bar chart pengeluaran dan pemasukan per kategori." />
        <FlowStep num={5} title="Transaksi terbaru" desc="List transaksi terbaru dengan detail provider, kategori, dan status." />
      </Card>

      <SubTitle>5. Manajemen Kategori</SubTitle>
      <Card className="mb-6">
        <FlowStep num={1} title="Buat kategori" desc="User membuat kategori dengan nama dan kode unik (maks 5 karakter). Contoh: nama='Gaji Karyawan', kode='GAJI'." />
        <FlowStep num={2} title="Auto-assign" desc="Setelah kategori dibuat, sistem otomatis mencari transaksi yang deskripsinya mengandung keyword dari nama kategori dan mengassign kategori tersebut." />
        <FlowStep num={3} title="Re-assign manual" desc="User bisa trigger re-assign ulang semua transaksi tanpa kategori via POST /api/categories/reassign." />
      </Card>

      <SubTitle>6. Laporan Keuangan</SubTitle>
      <Card className="mb-6">
        <FlowStep num={1} title="Pilih periode & filter" desc="User memilih rentang tanggal, rekening, dan tipe sumber (bank/wallet)." />
        <FlowStep num={2} title="Laporan pengeluaran" desc="Trend pengeluaran, breakdown per kategori, breakdown per sumber rekening, perbandingan vs periode sebelumnya." />
        <FlowStep num={3} title="Laporan pemasukan" desc="Sama seperti pengeluaran tapi untuk transaksi CREDIT." />
        <FlowStep num={4} title="Laporan periode" desc="Laporan gabungan income + expense + net flow untuk periode tertentu." />
      </Card>

      <SubTitle>7. Kalender Transaksi</SubTitle>
      <Card className="mb-6">
        <FlowStep num={1} title="Tampilan kalender bulanan" desc="Setiap hari yang ada transaksi menampilkan ringkasan: total credit, total debit, jumlah transaksi." />
        <FlowStep num={2} title="Detail per hari" desc="Klik hari untuk melihat list transaksi lengkap pada hari tersebut (via GET /api/calendar/[date])." />
        <FlowStep num={3} title="Timezone WIB" desc="Semua tanggal dikonversi ke WIB (UTC+7) untuk pengelompokan yang akurat." />
      </Card>

      <SubTitle>Middleware & Proteksi Route</SubTitle>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-2 dark:text-gray-200">Halaman Publik (tanpa login)</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              {["/auth/login", "/auth/register", "/auth/change-password", "/auth/oauth-callback", "/docs"].map((p) => (
                <li key={p}>
                  <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-700 dark:text-gray-300">{p}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2 dark:text-gray-200">API Publik (tanpa token)</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              {["/api/auth/login", "/api/auth/register", "/api/auth/send-otp", "/api/auth/verify-otp", "/api/auth/callback/*"].map((p) => (
                <li key={p}>
                  <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-700 dark:text-gray-300">{p}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
          Semua halaman lain redirect ke /auth/login jika tidak ada cookie{" "}
          <code className="dark:text-gray-400">token</code>. Semua API lain wajib header{" "}
          <code className="dark:text-gray-400">Authorization: Bearer &lt;token&gt;</code>.
        </p>
      </Card>
    </DocLayout>
  );
}
