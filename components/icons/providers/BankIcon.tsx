interface Props {
  provider: string;
  size?: number;
  className?: string;
}

// BCA — biru tua dengan tulisan BCA
function BCA({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#005BAA" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">BCA</text>
    </svg>
  );
}

// BRI — biru dengan aksen oranye
function BRI({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#003D7A" />
      <rect x="0" y="28" width="40" height="12" rx="0" fill="#F7941D" />
      <rect x="0" y="28" width="40" height="12" rx="8" fill="#F7941D" />
      <text x="50%" y="48%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">BRI</text>
    </svg>
  );
}

// BNI — oranye
function BNI({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#F7941D" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">BNI</text>
    </svg>
  );
}

// Mandiri — kuning-biru
function MANDIRI({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#003087" />
      <rect x="0" y="26" width="40" height="14" rx="0" fill="#F7C600" />
      <rect x="0" y="26" width="40" height="14" rx="8" fill="#F7C600" />
      <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700" fontFamily="Arial, sans-serif">MANDIRI</text>
    </svg>
  );
}

// CIMB — merah
function CIMB({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#C8102E" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif">CIMB</text>
    </svg>
  );
}

// PERMATA — hijau
function PERMATA({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#00843D" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">PERMATA</text>
    </svg>
  );
}

// DANAMON — merah-oranye
function DANAMON({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#E31837" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">DANAMON</text>
    </svg>
  );
}

// BTN — biru muda
function BTN({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0070BA" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">BTN</text>
    </svg>
  );
}

// BSI — hijau gelap
function BSI({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#1B5E20" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">BSI</text>
    </svg>
  );
}

// OTHER — abu
function OTHER_BANK({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#6B7280" />
      <path d="M20 10l12 6v2H8v-2l12-6zM10 18h4v8h-4v-8zM18 18h4v8h-4v-8zM26 18h4v8h-4v-8zM8 28h24v2H8v-2z" fill="white" />
    </svg>
  );
}

const bankMap: Record<string, React.FC<{ size: number }>> = {
  BCA: BCA, BRI: BRI, BNI: BNI, MANDIRI: MANDIRI,
  CIMB: CIMB, PERMATA: PERMATA, DANAMON: DANAMON,
  BTN: BTN, BSI: BSI, OTHER: OTHER_BANK,
};

export default function BankProviderIcon({ provider, size = 40, className }: Props) {
  const Icon = bankMap[provider] ?? OTHER_BANK;
  return (
    <span className={className}>
      <Icon size={size} />
    </span>
  );
}
