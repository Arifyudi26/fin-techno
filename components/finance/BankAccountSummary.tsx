import { useState } from "react";
import { BankAccountBalance } from "@/lib/types/dashboard";

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const providerColors: Record<string, string> = {
  BCA: "bg-blue-500", BRI: "bg-brand-500", MANDIRI: "bg-warning-500",
  BNI: "bg-orange-500", CIMB: "bg-red-500", BSI: "bg-green-600",
  GOPAY: "bg-green-500", OVO: "bg-purple-500", DANA: "bg-blue-400",
  SHOPEEPAY: "bg-orange-400", LINKAJA: "bg-red-400", JENIUS: "bg-cyan-500",
  OTHER: "bg-gray-400",
};

interface Props {
  data?: BankAccountBalance[];
  loading?: boolean;
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null, type: "BANK" | "WALLET" | null) => void;
}

export default function BankAccountSummary({ data = [], loading, selectedAccountId, onSelectAccount }: Props) {
  const [filter, setFilter] = useState<"ALL" | "BANK" | "WALLET">("ALL");

  const banks = data.filter((a) => a.source !== "WALLET");
  const wallets = data.filter((a) => a.source === "WALLET");
  const total = data.reduce((s, a) => s + a.balance, 0);
  const bankTotal = banks.reduce((s, a) => s + a.balance, 0);
  const walletTotal = wallets.reduce((s, a) => s + a.balance, 0);

  const displayed = filter === "ALL" ? data : filter === "BANK" ? banks : wallets;

  const handleClick = (acc: BankAccountBalance) => {
    if (!onSelectAccount) return;
    if (selectedAccountId === acc.id) {
      onSelectAccount(null, null);
    } else {
      onSelectAccount(acc.id, acc.source ?? "BANK");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Rekening & Dompet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Klik untuk filter dashboard</p>
        </div>
        {/* Filter tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-fit">
          {(["ALL", "BANK", "WALLET"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {f === "ALL" ? "Semua" : f === "BANK" ? "Bank" : "Wallet"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          {/* Total summary */}
          <div className="mb-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <p className="text-sm text-brand-600 dark:text-brand-400 mb-1">Total Saldo Gabungan</p>
            <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{fmt(total)}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Bank: <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(bankTotal)}</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Dompet: <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(walletTotal)}</span>
              </span>
            </div>
          </div>

          {/* Account list */}
          <div className="space-y-2">
            {displayed.length === 0 ? (
              <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-4">Tidak ada rekening</p>
            ) : (
              displayed.map((acc) => {
                const isWallet = acc.source === "WALLET";
                const isSelected = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleClick(acc)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10"
                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${providerColors[acc.bankProvider] ?? "bg-gray-400"} flex items-center justify-center shrink-0`}>
                        <span className="text-white text-xs font-bold">{acc.bankProvider.slice(0, 3)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{acc.bankProvider}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isWallet
                              ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                              : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          }`}>
                            {isWallet ? "WALLET" : "BANK"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {acc.accountName} · ***{acc.accountNumber.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{fmt(acc.balance)}</p>
                      {isSelected && (
                        <p className="text-[10px] text-brand-500 dark:text-brand-400 mt-0.5">Difilter</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
