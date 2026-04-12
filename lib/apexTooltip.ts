/**
 * Shared ApexCharts tooltip builder.
 * Wrapper div is transparent — ApexCharts provides its own .apexcharts-tooltip shell.
 * Set tooltip.marker.show = false in chart options to hide the default color boxes.
 */

const fmt = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

// No background/border — the outer .apexcharts-tooltip shell handles that
const WRAP = `padding: 2px 0; font-family: Outfit, sans-serif;`;

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
  const rows = series
    .map((s, i) => {
      const val = s[dataPointIndex] ?? 0;
      return `<div style="${ROW}${i > 0 ? "margin-top:5px;" : ""}">
        <div style="display:flex;align-items:center;gap:6px;">
          ${DOT(colors[i])}
          <span style="color:${colors[i]};font-size:12px;">${names[i]}</span>
        </div>
        <span style="color:${colors[i]};font-size:12px;font-weight:600;white-space:nowrap;">${fmt(val)}</span>
      </div>`;
    })
    .join("");
  return `<div style="${WRAP}min-width:${minWidth}px;">${rows}</div>`;
}

/** Single-series bar tooltip */
export function singleSeriesTooltip(
  val: number,
  label: string,
  color: string,
): string {
  return `<div style="${WRAP}min-width:140px;">
    <div style="${ROW}">
      <div style="display:flex;align-items:center;gap:6px;">
        ${DOT(color)}
        <span style="color:${color};font-size:12px;">${label}</span>
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
  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
  return `<div style="${WRAP}min-width:160px;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
      ${DOT(color)}
      <span style="color:${color};font-size:12px;font-weight:600;">${label}</span>
    </div>
    <div style="${ROW}">
      <span style="font-size:12px;">Jumlah</span>
      <span style="color:${color};font-size:12px;font-weight:600;">${fmt(val)}</span>
    </div>
    <div style="${ROW}margin-top:3px;">
      <span style="font-size:12px;">Porsi</span>
      <span style="font-size:12px;font-weight:600;">${pct}%</span>
    </div>
  </div>`;
}
