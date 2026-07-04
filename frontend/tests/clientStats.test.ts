import { describe, expect, it } from "vitest";

import { describeCategorical, mean, median, sampleSkew, sampleStd } from "../src/lib/clientStats";

// Reference values generated from real pandas (Series.mean/median/std/skew)
// to keep this JS implementation numerically consistent with the backend's
// pandas-based engine (see backend/app/engine/descriptives.py).
const cases: {
  values: number[];
  mean: number;
  median: number;
  std: number | null;
  skew: number | null;
}[] = [
  { values: [20, 30, 40], mean: 30.0, median: 30.0, std: 10.0, skew: 0.0 },
  {
    values: [1, 2, 3, 4, 100],
    mean: 22.0,
    median: 3.0,
    std: 43.617656975128774,
    skew: 2.2323959116364573,
  },
  { values: [5, 5, 5], mean: 5.0, median: 5.0, std: 0.0, skew: 0.0 },
  { values: [1, 2], mean: 1.5, median: 1.5, std: 0.7071067811865476, skew: null },
  {
    values: [1, 1, 1, 1, 2, 2, 3, 10, 20, 55],
    mean: 9.6,
    median: 2.0,
    std: 17.076299364909246,
    skew: 2.537985012728027,
  },
  {
    values: [-5, 0, 5, 10, 100],
    mean: 22.0,
    median: 5.0,
    std: 43.96020928066653,
    skew: 2.146184076648337,
  },
];

describe("clientStats", () => {
  it.each(cases)("matches pandas for %j", (c) => {
    expect(mean(c.values)).toBeCloseTo(c.mean, 9);
    expect(median(c.values)).toBeCloseTo(c.median, 9);
    if (c.std === null) {
      expect(sampleStd(c.values)).toBeNull();
    } else {
      expect(sampleStd(c.values)).toBeCloseTo(c.std, 9);
    }
    if (c.skew === null) {
      expect(sampleSkew(c.values)).toBeNull();
    } else {
      expect(sampleSkew(c.values)).toBeCloseTo(c.skew, 9);
    }
  });

  it("returns null std for a single value", () => {
    expect(sampleStd([42])).toBeNull();
  });

  it("returns null skew for fewer than 3 values", () => {
    expect(sampleSkew([1, 2])).toBeNull();
  });

  it("counts top categories in descending frequency order", () => {
    const result = describeCategorical(["A", "B", "A", "A", "C", "B"]);
    expect(result).toEqual([
      { value: "A", count: 3 },
      { value: "B", count: 2 },
      { value: "C", count: 1 },
    ]);
  });
});
