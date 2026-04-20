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
