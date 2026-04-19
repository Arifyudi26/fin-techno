import DocLayout from "@/components/docs/DocLayout";
import { Code, SectionTitle, SubTitle } from "@/components/docs/shared";

export default function DocsOverview() {
  return (
    <DocLayout title="Overview">
      <SectionTitle>Overview</SectionTitle>
      <p className="text-gray-600 mb-6 leading-relaxed dark:text-gray-400">
        <strong>Fin-Techno</strong> adalah aplikasi manajemen keuangan pribadi berbasis web. Upload
        e-statement dari bank atau dompet digital, dan aplikasi akan otomatis mem-parsing,
        mengkategorikan, serta menampilkan analitik keuangan kamu dalam satu dashboard.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { title: "Upload E-Statement", desc: "CSV, XLSX, PDF dari BRI, BCA, Mandiri, BNI, CIMB, GoPay, OVO, DANA, ShopeePay" },
          { title: "Dashboard Keuangan", desc: "Metrik income, expense, net flow, cash flow trend, dan spending by category" },
          { title: "Kalender Transaksi", desc: "Lihat ringkasan harian, klik hari untuk detail transaksi" },
          { title: "Laporan Keuangan", desc: "Laporan pengeluaran & pemasukan per periode dengan breakdown kategori" },
          { title: "Manajemen Kategori", desc: "Buat kategori dengan auto-assign keyword ke transaksi yang cocok" },
          { title: "Multi-Rekening", desc: "Kelola beberapa rekening bank dan dompet digital sekaligus" },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="font-semibold text-gray-800 mb-1 dark:text-gray-100">{f.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>

      <SubTitle>Tech Stack</SubTitle>
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          "Next.js 15", "TypeScript", "PostgreSQL (Neon)", "Prisma ORM",
          "JWT Auth", "NextAuth v4", "Zustand", "ApexCharts",
          "FullCalendar", "Tailwind CSS", "Vercel Blob", "QStash",
        ].map((t) => (
          <span key={t} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {t}
          </span>
        ))}
      </div>

      <SubTitle>Authentication</SubTitle>
      <p className="text-sm text-gray-600 mb-3">
        Semua endpoint API (kecuali{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">/api/auth/*</code>) memerlukan header:
      </p>
      <Code>{`Authorization: Bearer <JWT_TOKEN>`}</Code>

      <SubTitle>URL</SubTitle>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-gray-600 font-medium dark:text-gray-300">Environment</th>
              <th className="px-4 py-2 text-left text-gray-600 font-medium dark:text-gray-300">URL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Local</td>
              <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400">http://localhost:3000</td>
            </tr>
            <tr className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Production</td>
              <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400">https://fin-techno.vercel.app</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DocLayout>
  );
}
