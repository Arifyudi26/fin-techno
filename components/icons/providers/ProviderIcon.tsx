import BankProviderIcon from "./BankIcon";
import WalletProviderIcon from "./WalletIcon";

interface Props {
  provider: string;
  sourceType: "BANK" | "WALLET";
  size?: number;
  className?: string;
}

export default function ProviderIcon({ provider, sourceType, size = 40, className }: Props) {
  if (sourceType === "WALLET") {
    return <WalletProviderIcon provider={provider} size={size} className={className} />;
  }
  return <BankProviderIcon provider={provider} size={size} className={className} />;
}
