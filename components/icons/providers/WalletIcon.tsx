interface Props {
  provider: string;
  size?: number;
  className?: string;
}

// GoPay — hijau Gojek
function GOPAY({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#00AA13" />
      {/* G circle */}
      <circle cx="20" cy="18" r="8" fill="white" />
      <path d="M20 12a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" fill="#00AA13" />
      <rect x="20" y="17" width="5" height="2" rx="1" fill="#00AA13" />
      <text x="50%" y="88%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">GoPay</text>
    </svg>
  );
}

// OVO — ungu
function OVO({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#4C3494" />
      {/* OVO wordmark style */}
      <circle cx="13" cy="20" r="5" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="27" cy="20" r="5" stroke="white" strokeWidth="2" fill="none" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial, sans-serif">OVO</text>
    </svg>
  );
}

// DANA — biru cerah
function DANA({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#118EEA" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif">DANA</text>
    </svg>
  );
}

// ShopeePay — oranye Shopee
function SHOPEEPAY({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#EE4D2D" />
      {/* Shopee bag icon simplified */}
      <path d="M14 16h12l-1.5 10H15.5L14 16z" fill="white" fillOpacity="0.9" />
      <path d="M17 16c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <text x="50%" y="88%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="6" fontWeight="700" fontFamily="Arial, sans-serif">ShopeePay</text>
    </svg>
  );
}

// LinkAja — merah Telkomsel
function LINKAJA({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#E82529" />
      {/* Chain link icon */}
      <path d="M15 20a3 3 0 000 6h3a3 3 0 000-6h-1" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 14a3 3 0 010 6h-3a3 3 0 010-6h1" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="22" x2="22" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <text x="50%" y="88%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="700" fontFamily="Arial, sans-serif">LinkAja</text>
    </svg>
  );
}

// Sakuku — pink BCA
function SAKUKU({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#E91E8C" />
      {/* Wallet icon */}
      <rect x="10" y="14" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" fill="none" />
      <path d="M10 19h20" stroke="white" strokeWidth="1.8" />
      <circle cx="26" cy="22" r="1.5" fill="white" />
      <text x="50%" y="88%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">Sakuku</text>
    </svg>
  );
}

// Jenius — biru BTPN
function JENIUS({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#2B4BF2" />
      {/* J letter stylized */}
      <path d="M22 11v14c0 2.5-2 4-4 4s-4-1.5-4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <text x="50%" y="88%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">Jenius</text>
    </svg>
  );
}

// OTHER wallet
function OTHER_WALLET({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#6B7280" />
      <rect x="8" y="13" width="24" height="16" rx="3" stroke="white" strokeWidth="1.8" fill="none" />
      <path d="M8 19h24" stroke="white" strokeWidth="1.8" />
      <circle cx="28" cy="23" r="2" fill="white" />
    </svg>
  );
}

const walletMap: Record<string, React.FC<{ size: number }>> = {
  GOPAY: GOPAY, OVO: OVO, DANA: DANA, SHOPEEPAY: SHOPEEPAY,
  LINKAJA: LINKAJA, SAKUKU: SAKUKU, JENIUS: JENIUS, OTHER: OTHER_WALLET,
};

export default function WalletProviderIcon({ provider, size = 40, className }: Props) {
  const Icon = walletMap[provider] ?? OTHER_WALLET;
  return (
    <span className={className}>
      <Icon size={size} />
    </span>
  );
}
