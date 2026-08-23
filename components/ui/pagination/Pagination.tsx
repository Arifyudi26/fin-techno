import type { PaginationProps } from "@/lib/types/ui";
import { useI18n } from "@lib/i18n";

const LIMIT_OPTIONS = [10, 25, 50, 100];

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: PaginationProps) {
  const { t, lang } = useI18n();
  const tc = t.common;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // numbered pages with ellipsis
  const pages: (number | "...")[] = [];
  const seen = new Set<number>();
  const push = (n: number) => { if (!seen.has(n)) { seen.add(n); pages.push(n); } };

  push(1);
  if (page > 3) pages.push("...");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i);
  if (page < totalPages - 2) pages.push("...");
  if (totalPages > 1) push(totalPages);

  const base = "min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center";
  const active = `${base} bg-brand-500 text-white`;
  const normal = `${base} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800`;
  const off    = `${base} border border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      {/* Left: info + rows per page */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {total === 0 ? tc.noData : `${from}–${to} ${tc.paginationOf} ${total.toLocaleString(lang === "id" ? "id-ID" : "en-US")}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{tc.rowsPerPage}</span>
          <select
            value={limit}
            onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1); }}
            className="h-8 w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
            style={{ paddingTop: 0, paddingBottom: 0, lineHeight: "2rem" }}
          >
            {LIMIT_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={page <= 1 ? off : normal}>←</button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="min-w-[32px] h-8 flex items-center justify-center text-xs text-gray-400">…</span>
            ) : (
              <button key={p} onClick={() => onPageChange(p as number)} className={p === page ? active : normal}>
                {p}
              </button>
            )
          )}
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={page >= totalPages ? off : normal}>→</button>
        </div>
      )}
    </div>
  );
}
