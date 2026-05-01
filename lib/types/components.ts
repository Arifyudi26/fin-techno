import { ReactNode } from "react";

// Layout
export interface LayoutProps {
  children: ReactNode;
}

export type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

// Auth
export type SignInStep = "credentials" | "otp";
export type SignUpStep = "form" | "otp";

export interface OtpInputProps {
  email: string;
  purpose?: string;
  onVerified: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
}

// Common
export interface BreadcrumbProps {
  pageTitle: string;
}

// Icon Providers
export interface BankIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export interface WalletIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export interface ProviderIconProps {
  provider: string;
  sourceType: "BANK" | "WALLET";
  size?: number;
  className?: string;
}
