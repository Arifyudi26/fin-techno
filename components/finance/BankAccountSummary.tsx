import { BankAccountBalance } from "@/lib/types/dashboard";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const bankColors: Record<string, string> = {
  BCA: "bg-blue-500",
  BRI: "bg-brand-500",
  MANDIRI: "bg-warning-500",
  BNI: "bg-orange-500",
  CIMB: "bg-red-500",
  BSI: "bg-green-600",
  OTHER: "bg-gray-400",
};

interface Props {
  data?: BankAccountBalance[];
  loading?: boolean;
}

export default function BankAccountSummary({ data = [], loading }: Props) {
  const total = data.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Rekening Terhubung</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Saldo akhir dari upload terakhir
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-5 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <p className="text-sm text-brand-600 dark:text-brand-400 mb-1">Total Saldo</p>
            <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{formatIDR(total)}</p>
          </div>
          <div className="space-y-3">
            {data.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${bankColors[acc.bankProvider] ?? "bg-gray-400"} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{acc.bankProvider.slice(0, 3)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{acc.bankProvider}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ***{acc.accountNumber.slice(-4)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatIDR(acc.balance)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
