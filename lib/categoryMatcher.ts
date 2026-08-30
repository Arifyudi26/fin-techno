/**
 * Category keyword matching — digunakan oleh upload/process.ts dan categories/reassign.ts.
 */
import prisma from "@lib/db";

export type CategoryEntry = { id: string; keywords: string[] };

/** Load semua kategori milik user, extract keywords dari nama kategori */
export async function loadCategories(userId: string): Promise<CategoryEntry[]> {
  const cats = await prisma.transactionCategory.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  return cats.map((c) => ({
    id: c.id,
    keywords: c.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
  }));
}

/** Return semua category id yang match deskripsi transaksi */
export function resolveCategoryIds(desc: string, categories: CategoryEntry[]): string[] {
  const lower = desc.toLowerCase();
  return categories
    .filter((cat) => cat.keywords.some((k) => lower.includes(k)))
    .map((cat) => cat.id);
}

/**
 * Kamus rekomendasi kategori berbasis keyword (rule-based, tanpa AI).
 * Setiap entry memetakan sekumpulan keyword umum (merchant, istilah) ke
 * satu kategori usulan lengkap dengan kode dan padanan Bahasa Inggris.
 * Dipakai oleh /api/categories/recommendations untuk menyarankan kategori
 * dari transaksi yang belum terkategorikan.
 */
export type CategoryTemplate = {
  /** Kode kategori (maks. 5 char), unik per user */
  code: string;
  /** Nama kategori usulan (Bahasa Indonesia) */
  nameId: string;
  /** Nama kategori usulan (Bahasa Inggris) */
  nameEn: string;
  /** Keyword (lowercase) yang menandakan transaksi masuk kategori ini */
  keywords: string[];
};

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    code: "MKN",
    nameId: "Makan & Minum",
    nameEn: "Food & Drink",
    keywords: [
      "starbucks", "kopi", "coffee", "resto", "restaurant", "cafe", "kafe",
      "mcd", "mcdonald", "kfc", "burger", "pizza", "warung", "warteg", "bakso",
      "gofood", "grabfood", "shopeefood", "food", "makan", "minum", "chatime",
      "kulineran", "dimsum", "seblak", "geprek", "ayam", "kebab", "roti",
    ],
  },
  {
    code: "TRP",
    nameId: "Transportasi",
    nameEn: "Transportation",
    keywords: [
      "grab", "gojek", "gocar", "goride", "uber", "maxim", "taxi", "taksi",
      "bluebird", "mrt", "krl", "transjakarta", "busway", "kereta", "tiket",
      "parkir", "parking", "tol", "e-toll", "etoll", "flazz", "grabbike",
    ],
  },
  {
    code: "BBM",
    nameId: "Bahan Bakar",
    nameEn: "Fuel",
    keywords: [
      "pertamina", "shell", "spbu", "bbm", "pertalite", "pertamax", "solar",
      "bensin", "vivo", "bp ", "fuel",
    ],
  },
  {
    code: "BLJ",
    nameId: "Belanja",
    nameEn: "Shopping",
    keywords: [
      "tokopedia", "shopee", "lazada", "bukalapak", "blibli", "zalora",
      "alfamart", "indomaret", "superindo", "hypermart", "carrefour",
      "transmart", "supermarket", "minimarket", "belanja", "mall", "matahari",
      "uniqlo", "hm ", "zara",
    ],
  },
  {
    code: "TAG",
    nameId: "Tagihan & Utilitas",
    nameEn: "Bills & Utilities",
    keywords: [
      "pln", "listrik", "pdam", "air", "token", "internet", "indihome",
      "telkom", "wifi", "biznet", "firstmedia", "myrepublic", "iuran",
      "utilitas", "tagihan",
    ],
  },
  {
    code: "PLS",
    nameId: "Pulsa & Data",
    nameEn: "Mobile Credit & Data",
    keywords: [
      "pulsa", "telkomsel", "indosat", "xl ", "axis", "smartfren", "tri ",
      "by.u", "byu", "kuota", "paket data", "voucher",
    ],
  },
  {
    code: "HBR",
    nameId: "Hiburan & Langganan",
    nameEn: "Entertainment & Subscriptions",
    keywords: [
      "netflix", "spotify", "youtube", "disney", "hbo", "vidio", "wetv",
      "viu", "iflix", "steam", "playstation", "xbox", "game", "bioskop",
      "cinema", "cgv", "xxi", "cinepolis", "langganan", "subscription",
      "prime", "canva", "chatgpt", "openai",
    ],
  },
  {
    code: "KSH",
    nameId: "Kesehatan",
    nameEn: "Health",
    keywords: [
      "apotek", "apotik", "kimia farma", "guardian", "watson", "rumah sakit",
      "rs ", "klinik", "dokter", "hospital", "bpjs", "halodoc", "alodokter",
      "farmasi", "medical", "obat",
    ],
  },
  {
    code: "GAJ",
    nameId: "Gaji & Pendapatan",
    nameEn: "Salary & Income",
    keywords: [
      "gaji", "salary", "payroll", "thr", "bonus", "komisi", "commission",
      "honor", "fee", "pendapatan", "income", "transfer masuk",
    ],
  },
  {
    code: "TRF",
    nameId: "Transfer",
    nameEn: "Transfer",
    keywords: [
      "transfer", "trf", "kirim", "topup", "top up", "top-up", "isi saldo",
      "va ", "virtual account", "qris", "bi-fast", "bifast", "flip", "dana",
    ],
  },
  {
    code: "ADM",
    nameId: "Biaya Admin",
    nameEn: "Admin Fee",
    keywords: [
      "biaya admin", "admin fee", "biaya adm", "fee transfer", "biaya bulanan",
      "biaya transaksi", "charge", "pajak", "tax", "materai",
    ],
  },
  {
    code: "INV",
    nameId: "Investasi & Tabungan",
    nameEn: "Investment & Savings",
    keywords: [
      "reksadana", "reksa dana", "saham", "bibit", "ajaib", "stockbit",
      "pluang", "crypto", "bitcoin", "deposito", "emas", "pegadaian",
      "investasi", "invest", "tabungan",
    ],
  },
  {
    code: "PDK",
    nameId: "Pendidikan",
    nameEn: "Education",
    keywords: [
      "spp", "kuliah", "sekolah", "kampus", "universitas", "kursus", "course",
      "udemy", "ruangguru", "zenius", "buku", "pendidikan", "les ", "tuition",
    ],
  },
];

export type CategorySuggestion = {
  code: string;
  name: string;
  matchCount: number;
  totalAmount: number;
};

type TxLike = { description: string; amount: number };

/**
 * Hitung rekomendasi kategori dari daftar transaksi (biasanya yang belum
 * terkategorikan). Untuk tiap template, hitung berapa transaksi yang cocok
 * dan total nominalnya. `existingCodes`/`existingNames` (lowercase) dipakai
 * untuk membuang usulan yang sudah dimiliki user.
 */
export function buildCategorySuggestions(
  transactions: TxLike[],
  lang: "id" | "en",
  existingCodes: Set<string>,
  existingNames: Set<string>,
): CategorySuggestion[] {
  const stats = new Map<string, { matchCount: number; totalAmount: number }>();

  for (const tx of transactions) {
    const lower = tx.description.toLowerCase();
    for (const tpl of CATEGORY_TEMPLATES) {
      if (tpl.keywords.some((k) => lower.includes(k))) {
        const cur = stats.get(tpl.code) ?? { matchCount: 0, totalAmount: 0 };
        cur.matchCount += 1;
        cur.totalAmount += Math.abs(tx.amount);
        stats.set(tpl.code, cur);
      }
    }
  }

  const suggestions: CategorySuggestion[] = [];
  for (const tpl of CATEGORY_TEMPLATES) {
    const s = stats.get(tpl.code);
    if (!s || s.matchCount === 0) continue;
    const name = lang === "en" ? tpl.nameEn : tpl.nameId;
    // Skip kalau user sudah punya kategori dengan kode / nama yang sama
    if (existingCodes.has(tpl.code.toLowerCase())) continue;
    if (existingNames.has(name.toLowerCase())) continue;
    suggestions.push({
      code: tpl.code,
      name,
      matchCount: s.matchCount,
      totalAmount: s.totalAmount,
    });
  }

  // Urutkan dari yang paling banyak transaksinya
  suggestions.sort((a, b) => b.matchCount - a.matchCount);
  return suggestions;
}
