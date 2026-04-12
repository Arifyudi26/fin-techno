/**
 * Shared ApexCharts tooltip builder.
 * Uses .apexcharts-custom-tooltip class so the outer shell becomes transparent (see globals.css).
 * All styling (bg, border, shadow, font) is self-contained in the HTML string.
 * Dark mode is detected at call-time via document.documentElement.classList.
 */

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const isDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const WRAP = (minWidth: number) => {
  const dark = isDark();
  const bg     = dark ? "#111827" : "#ffffff";
  const border = dark ? "#1f2937" : "#e5e7eb";
  const shadow = dark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.08)";
  return `class="apexcharts-custom-tooltip" style="background:${bg};border:1px solid ${border};border-radius:8px;padding:10px 12px;box-shadow:${shadow};font-family:Outfit,sans-serif;min-width:${minWidth}px;"`;
};

const labelColor  = () => isDark() ? "#d1d5db" : "#374151";
const mutedColor  = () => isDark() ? "#6b7280" : "#6b7280";

const ROW = `display:flex;align-items:center;justify-content:space-between;gap:16px;`;

const DOT = (color: string) =>
  `<span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>`;

/** Multi-series bar/line/area tooltip */
export function multiSeriestooltip(
  series: number[][],
  dataPointIndex: number,
  names: string[],
  colors: string[],
  minWidth = 160,
): string {
  const lc = labelColor();
  const rows = series
    .map((s, i) => {
      const val = s[dataPointIndex] ?? 0;
      return `<div style="${ROW}${i > 0 ? "margin-top:5px;" : ""}">
        <div style="display:flex;align-items:center;gap:6px;">
          ${DOT(colors[i])}
          <span style="color:${lc};font-size:12px;">${names[i]}</span>
        </div>
        <span style="color:${colors[i]};font-size:12px;font-weight:600;white-space:nowrap;">${fmt(val)}</span>
      </div>`;
    })
    .join("");
  return `<div ${WRAP(minWidth)}>${rows}</div>`;
}

/** Single-series bar tooltip */
export function singleSeriesTooltip(
  val: number,
  label: string,
  color: string,
): string {
  const lc = labelColor();
  return `<div ${WRAP(140)}>
    <div style="${ROW}">
      <div style="display:flex;align-items:center;gap:6px;">
        ${DOT(color)}
        <span style="color:${lc};font-size:12px;">${label}</span>
      </div>
      <span style="color:${color};font-size:12px;font-weight:600;white-space:nowrap;">${fmt(val)}</span>
    </div>
  </div>`;
}

/** Donut/pie tooltip */
export function donutTooltip(
  val: number,
  total: number,
  label: string,
  color: string,
): string {
  const lc = labelColor();
  const mc = mutedColor();
  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
  return `<div ${WRAP(160)}>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      ${DOT(color)}
      <span style="color:${lc};font-size:12px;font-weight:600;">${label}</span>
    </div>
    <div style="${ROW}">
      <span style="color:${mc};font-size:12px;">Jumlah</span>
      <span style="color:${color};font-size:12px;font-weight:600;">${fmt(val)}</span>
    </div>
    <div style="${ROW}margin-top:3px;">
      <span style="color:${mc};font-size:12px;">Porsi</span>
      <span style="color:${lc};font-size:12px;font-weight:600;">${pct}%</span>
    </div>
  </div>`;
}
