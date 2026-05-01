import BankProviderIcon from "./BankIcon";
import WalletProviderIcon from "./WalletIcon";
import type { ProviderIconProps } from "@/lib/types/components";

export default function ProviderIcon({ provider, sourceType, size = 40, className }: ProviderIconProps) {
  if (sourceType === "WALLET") {
    return <WalletProviderIcon provider={provider} size={size} className={className} />;
  }
  return <BankProviderIcon provider={provider} size={size} className={className} />;
}
