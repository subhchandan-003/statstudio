import type { CategoryCount, NumericStats } from "./api";

export const TOP_CATEGORIES = 5;

export function safeNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function mean(values: number[]): number {
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function sampleStd(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const m = mean(values);
  const variance = values.reduce((sum, x) => sum + (x - m) ** 2, 0) / (n - 1);
  return safeNumber(Math.sqrt(variance));
}

// Matches pandas' Series.skew(): adjusted Fisher-Pearson standardized moment
// coefficient. Undefined below n=3 (pandas returns NaN); a zero-variance
// series returns 0, not NaN, matching pandas' behavior on constant columns.
export function sampleSkew(values: number[]): number | null {
  const n = values.length;
  if (n < 3) return null;
  const m = mean(values);
  const m2 = values.reduce((sum, x) => sum + (x - m) ** 2, 0) / n;
  if (m2 === 0) return 0;
  const m3 = values.reduce((sum, x) => sum + (x - m) ** 3, 0) / n;
  const g1 = m3 / Math.pow(m2, 1.5);
  const adjusted = g1 * (Math.sqrt(n * (n - 1)) / (n - 2));
  return safeNumber(adjusted);
}

export function describeNumeric(values: number[]): NumericStats {
  if (values.length === 0) {
    return { mean: null, median: null, std: null, min: null, max: null, skew: null };
  }
  return {
    mean: safeNumber(mean(values)),
    median: safeNumber(median(values)),
    std: sampleStd(values),
    min: safeNumber(Math.min(...values)),
    max: safeNumber(Math.max(...values)),
    skew: sampleSkew(values),
  };
}

export function describeCategorical(values: string[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORIES)
    .map(([value, count]) => ({ value, count }));
}
