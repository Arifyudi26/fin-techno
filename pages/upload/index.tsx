import { useState } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Link from "next/link";
import BankProviderIcon from "@components/icons/providers/BankIcon";
import WalletProviderIcon from "@components/icons/providers/WalletIcon";

const bankProviders: Array<{ id: string; name: string }> = [
  { id: "BCA", name: "BCA" },
  { id: "BRI", name: "BRI" },
  { id: "BNI", name: "BNI" },
  { id: "MANDIRI", name: "Mandiri" },
  { id: "CIMB", name: "CIMB Niaga" },
  { id: "BSI", name: "BSI" },
  { id: "OTHER", name: "Bank Lain" },
];

const walletProviders: Array<{ id: string; name: string }> = [
  { id: "GOPAY", name: "GoPay" },
  { id: "OVO", name: "OVO" },
  { id: "DANA", name: "DANA" },
  { id: "SHOPEEPAY", name: "ShopeePay" },
  { id: "LINKAJA", name: "LinkAja" },
  { id: "SAKUKU", name: "Sakuku" },
  { id: "JENIUS", name: "Jenius" },
  { id: "OTHER", name: "Dompet Lain" },
];

type Tab = "bank" | "wallet";

export default function Upload() {
  const [activeTab, setActiveTab] = useState<Tab>("bank");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const providers = activeTab === "bank" ? bankProviders : walletProviders;

  return (
    <AppLayout>
      <PageMeta title="Upload Mutasi | MyFinance" description="Upload file mutasi rekening bank atau dompet digital" />
      <PageBreadcrumb pageTitle="Upload Mutasi" />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload file mutasi untuk diproses otomatis
        </p>
        <Link
          href="/upload/riwayat"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Lihat Riwayat Upload
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-900 p-1 w-fit">
        <button
          onClick={() => { setActiveTab("bank"); setSelectedProvider(null); }}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "bank"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Rekening Bank
        </button>
        <button
          onClick={() => { setActiveTab("wallet"); setSelectedProvider(null); }}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "wallet"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 10H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="17" cy="15" r="1.5" fill="currentColor" />
          </svg>
          Dompet Digital
        </button>
      </div>

      {/* Provider selection */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Pilih {activeTab === "bank" ? "Bank" : "Dompet Digital"}
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProvider(p.id === selectedProvider ? null : p.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                selectedProvider === p.id
                  ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {activeTab === "bank"
                ? <BankProviderIcon provider={p.id} size={36} />
                : <WalletProviderIcon provider={p.id} size={36} />
              }
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
        selectedProvider
          ? "border-brand-400 dark:border-brand-500/50 bg-brand-50/30 dark:bg-brand-500/5"
          : "border-gray-300 dark:border-gray-700 bg-white dark:bg-white/[0.03]"
      } hover:border-brand-400 dark:hover:border-brand-500/50`}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#465FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {selectedProvider
            ? `Upload Mutasi ${providers.find(p => p.id === selectedProvider)?.name}`
            : "Drag & Drop File di Sini"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          {selectedProvider
            ? `Upload file mutasi ${activeTab === "bank" ? "rekening bank" : "dompet digital"} kamu. Sistem akan otomatis memproses transaksi.`
            : `Pilih ${activeTab === "bank" ? "bank" : "dompet digital"} terlebih dahulu, lalu upload file mutasi.`}
        </p>
        <button
          disabled={!selectedProvider}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Pilih File
        </button>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Format: CSV, XLSX, XLS, PDF · Maks. 10MB per file
        </p>
      </div>

      {/* Info cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { title: "Auto Parsing", desc: "Sistem otomatis membaca dan memproses data transaksi dari file", color: "bg-success-50 dark:bg-success-500/10", iconColor: "text-success-500" },
          { title: "Auto Kategorisasi", desc: "Transaksi otomatis dikategorikan berdasarkan deskripsi", color: "bg-brand-50 dark:bg-brand-500/10", iconColor: "text-brand-500" },
          { title: "Deteksi Duplikat", desc: "Sistem mendeteksi dan menandai transaksi duplikat otomatis", color: "bg-warning-50 dark:bg-warning-500/10", iconColor: "text-warning-500" },
        ].map((card) => (
          <div key={card.title} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
              <svg className={card.iconColor} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">{card.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{card.desc}</p>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
