import { Table, TableBody, TableCell, TableHeader, TableRow } from "@components/ui/table";
import Badge from "@components/ui/badge/Badge";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const transactions = [
  { id: 1, date: "2025-04-28", description: "Transfer Masuk - PT Maju Jaya", bank: "BCA", amount: 15_000_000, type: "CREDIT" as const, category: "Operasional", status: "VERIFIED" as const },
  { id: 2, date: "2025-04-27", description: "Pembayaran Listrik PLN", bank: "BRI", amount: -1_250_000, type: "DEBIT" as const, category: "Utilitas", status: "VERIFIED" as const },
  { id: 3, date: "2025-04-26", description: "Gaji Karyawan April", bank: "Mandiri", amount: -8_200_000, type: "DEBIT" as const, category: "Gaji", status: "VERIFIED" as const },
  { id: 4, date: "2025-04-25", description: "Penjualan Produk Online", bank: "BCA", amount: 4_500_000, type: "CREDIT" as const, category: "Operasional", status: "PENDING" as const },
  { id: 5, date: "2025-04-24", description: "Pembelian Bahan Baku", bank: "BNI", amount: -3_800_000, type: "DEBIT" as const, category: "Operasional", status: "PENDING" as const },
];

export default function RecentTransactions() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Transaksi Terbaru</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Dari semua rekening yang terhubung</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
          Lihat Semua
        </button>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tanggal</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Keterangan</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Bank</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Kategori</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Jumlah</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">{tx.date}</TableCell>
                <TableCell className="py-3">
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 max-w-[200px] truncate">{tx.description}</p>
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{tx.bank}</TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{tx.category}</TableCell>
                <TableCell className="py-3">
                  <span className={`font-semibold text-theme-sm ${tx.type === "CREDIT" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                    {tx.type === "CREDIT" ? "+" : ""}{formatIDR(Math.abs(tx.amount))}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <Badge size="sm" color={tx.status === "VERIFIED" ? "success" : "warning"}>
                    {tx.status === "VERIFIED" ? "Verified" : "Pending"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
