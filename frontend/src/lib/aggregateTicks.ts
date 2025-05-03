import type { AreaPayload } from "./kvTypes";

// utils/aggregateTicks.ts
export interface MonthlyCounts { [month: string]: number }   // "2025‑04" → 32

export function addMonthlyCounts(area: AreaPayload) {
  const monthify = (iso: string) => iso.slice(0, 7);        // "YYYY‑MM"
  area.areas.forEach(a => {
    const counts: MonthlyCounts = {};
    a.ticks.forEach(d => {
      const m = monthify(d);
      counts[m] = (counts[m] ?? 0) + 1;
    });
    // attach the aggregation right onto the object
    (a as any).monthly = counts;
  });
  return area;
}
