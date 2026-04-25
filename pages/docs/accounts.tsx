import DocLayout from "@/components/docs/DocLayout";
import { Endpoint, SectionTitle, SubTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsAccounts() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title="Bank & Wallet API">
      <SectionTitle>Bank Accounts & Wallets API</SectionTitle>
      <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
        {tr.api.authRequired}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">Authorization: Bearer &lt;token&gt;</code>
      </p>

      <SubTitle>{tr.api.bankAccountsSubtitle}</SubTitle>

      <Endpoint method="GET" path="/api/bank-accounts" desc={tr.api.bankListDesc}
        response={`{\n  "accounts": [{\n    "id": "clxyz...",\n    "bankProvider": "BRI",\n    "accountNumber": "039301026989508",\n    "accountName": "Budi Santoso",\n    "currency": "IDR",\n    "isActive": true,\n    "totalUploads": 3,\n    "totalTransactions": 450,\n    "totalCredit": 45000000,\n    "totalDebit": 32000000,\n    "lastPeriodEnd": "2026-03-31",\n    "lastBalance": 13000000\n  }]\n}`}
      />

      <Endpoint method="POST" path="/api/bank-accounts" desc={tr.api.bankAddDesc}
        body={`{\n  "bankProvider": "BRI",  // BRI | BCA | MANDIRI | BNI | CIMB | etc\n  "accountNumber": "039301026989508",\n  "accountName": "Budi Santoso",\n  "description": "..."  // optional\n}`}
        response={`{ "account": { "id": "clxyz...", "bankProvider": "BRI", ... } }`}
      />

      <Endpoint method="PUT" path="/api/bank-accounts/:id" desc={tr.api.bankUpdateDesc}
        body={`{ "accountName": "...", "description": "...", "isActive": true }`}
        response={`{ "account": { ...updated fields } }`}
      />

      <Endpoint method="DELETE" path="/api/bank-accounts/:id" desc={tr.api.bankDeleteDesc}
        response={`{ "ok": true }`}
      />

      <SubTitle>{tr.api.walletsSubtitle}</SubTitle>

      <Endpoint method="GET" path="/api/wallets" desc={tr.api.walletListDesc}
        response={`{\n  "wallets": [{\n    "id": "clxyz...",\n    "walletProvider": "GOPAY",\n    "phoneNumber": "08123456789",\n    "accountName": "Budi Santoso",\n    "isActive": true,\n    "totalUploads": 2,\n    "totalTransactions": 85,\n    "totalCredit": 5000000,\n    "totalDebit": 4200000\n  }]\n}`}
      />

      <Endpoint method="POST" path="/api/wallets" desc={tr.api.walletAddDesc}
        body={`{\n  "walletProvider": "GOPAY",  // GOPAY | OVO | DANA | SHOPEEPAY | etc\n  "phoneNumber": "08123456789",\n  "accountName": "Budi Santoso"\n}`}
        response={`{ "wallet": { "id": "clxyz...", ... } }`}
      />

      <Endpoint method="PUT" path="/api/wallets/:id" desc={tr.api.walletUpdateDesc}
        body={`{ "accountName": "...", "isActive": true }`}
        response={`{ "wallet": { ...updated fields } }`}
      />

      <Endpoint method="DELETE" path="/api/wallets/:id" desc={tr.api.walletDeleteDesc}
        response={`{ "ok": true }`}
      />
    </DocLayout>
  );
}
