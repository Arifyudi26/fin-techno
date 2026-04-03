const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const accounts = [
  { bank: "BCA", accountNumber: "***-1234", accountName: "PT Maju Jaya", balance: 48_250_000, color: "bg-blue-500" },
  { bank: "BRI", accountNumber: "***-5678", accountName: "PT Maju Jaya", balance: 12_800_000, color: "bg-brand-500" },
  { bank: "Mandiri", accountNumber: "***-9012", accountName: "PT Maju Jaya", balance: 31_500_000, color: "bg-warning-500" },
];

export default function BankAccountSummary() {
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Rekening Terhubung</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Total saldo semua rekening</p>

      <div className="mb-5 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10">
        <p className="text-sm text-brand-600 dark:text-brand-400 mb-1">Total Saldo</p>
        <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{formatIDR(total)}</p>
      </div>

      <div className="space-y-3">
        {accounts.map((acc) => (
          <div key={acc.accountNumber} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${acc.color} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{acc.bank.slice(0, 3)}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{acc.bank}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{acc.accountNumber}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatIDR(acc.balance)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
