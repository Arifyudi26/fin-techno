/**
 * Build date-range trend data (daily / weekly / monthly aggregation).
 * Digunakan oleh reports/income.ts dan reports/expense.ts.
 */

export type TrendPoint = {
  month: string;
  monthNum: number;
  total: number;
  count: number;
};

export function buildDateRangeTrend(
  allTx: { date: Date; amount: number }[],
  dateStart: Date,
  dateEnd: Date,
): TrendPoint[] {
  const diffDays = Math.ceil(
    (dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 31) {
    // Per hari
    const result: TrendPoint[] = [];
    const cur = new Date(dateStart);
    let i = 1;
    while (cur <= dateEnd) {
      const dayStr = cur.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const dayTx = allTx.filter((t) => t.date.toDateString() === cur.toDateString());
      result.push({
        month: dayStr,
        monthNum: i++,
        total: dayTx.reduce((s, t) => s + t.amount, 0),
        count: dayTx.length,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  if (diffDays <= 92) {
    // Per minggu
    const result: TrendPoint[] = [];
    const cur = new Date(dateStart);
    let weekNum = 1;
    while (cur <= dateEnd) {
      const weekEnd = new Date(cur);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > dateEnd) weekEnd.setTime(dateEnd.getTime());
      const weekTx = allTx.filter((t) => t.date >= cur && t.date <= weekEnd);
      result.push({
        month: `Mg ${weekNum}`,
        monthNum: weekNum,
        total: weekTx.reduce((s, t) => s + t.amount, 0),
        count: weekTx.length,
      });
      cur.setDate(cur.getDate() + 7);
      weekNum++;
    }
    return result;
  }

  // Per bulan
  const months = new Map<string, TrendPoint>();
  for (const t of allTx) {
    const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    const label = t.date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    const e = months.get(key) ?? {
      month: label,
      monthNum: t.date.getMonth() + 1,
      total: 0,
      count: 0,
    };
    months.set(key, { ...e, total: e.total + t.amount, count: e.count + 1 });
  }
  return Array.from(months.values());
}
