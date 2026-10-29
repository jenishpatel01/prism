import { describe, expect, it } from "vitest";
import { adjustedScore, computeScore, factsOf, gradeOf, withoutFingerprints, type ScoreInputs } from "@/lib/score";

const CLEAN: ScoreInputs = { crit: 0, high: 0, med: 0, avgCx: 4, dupPct: 3, cycles: 0 };

describe("computeScore", () => {
  it("gives 100 for a clean repository", () => {
    expect(computeScore(CLEAN)).toEqual({ score: 100, grade: "A" });
  });

  it("matches known values (golden)", () => {
    expect(computeScore({ ...CLEAN, crit: 1 })).toEqual({ score: 92, grade: "A−" });
    // 16 + 12.5 + 7.5 + 12 + 7 + 6 = 61 penalty
    expect(computeScore({ crit: 2, high: 10, med: 20, avgCx: 10, dupPct: 10, cycles: 3 })).toEqual({ score: 39, grade: "F" });
  });

  it("removing one critical issue raises the score by exactly 8, until the cap", () => {
    for (let crit = 1; crit <= 5; crit++) {
      expect(computeScore({ ...CLEAN, crit: crit - 1 }).score - computeScore({ ...CLEAN, crit }).score).toBe(8);
    }
    // 5 criticals already hit the 40-point cap; a sixth costs nothing more.
    expect(computeScore({ ...CLEAN, crit: 6 }).score).toBe(computeScore({ ...CLEAN, crit: 5 }).score);
  });

  it("never rises when any input gets worse", () => {
    const keys = ["crit", "high", "med", "avgCx", "dupPct", "cycles"] as const;
    const base: ScoreInputs = { crit: 1, high: 3, med: 5, avgCx: 6, dupPct: 6, cycles: 1 };
    for (const k of keys) {
      let last = computeScore(base).score;
      for (let step = 1; step <= 40; step++) {
        const now = computeScore({ ...base, [k]: base[k] + step }).score;
        expect(now, `${k} +${step}`).toBeLessThanOrEqual(last);
        last = now;
      }
    }
  });

  it("stays within 0 to 100", () => {
    expect(computeScore({ crit: 99, high: 999, med: 999, avgCx: 99, dupPct: 99, cycles: 99 }).score).toBe(0);
    expect(computeScore({ ...CLEAN, avgCx: 0, dupPct: 0 }).score).toBe(100);
  });
});

describe("gradeOf", () => {
  it.each([
    [100, "A"], [93, "A"], [92, "A−"], [88, "A−"], [87, "B+"], [83, "B+"], [82, "B"], [77, "B"], [76, "B−"], [70, "B−"],
    [69, "C+"], [65, "C+"], [64, "C"], [58, "C"], [57, "D"], [50, "D"], [49, "F"], [0, "F"],
  ])("%i is %s", (score, grade) => expect(gradeOf(score)).toBe(grade));
});

describe("rescoring without ignored findings", () => {
  const issues = [
    { fingerprint: "aaa", severity: "critical" as const, category: "security" as const, rule: "secret" },
    { fingerprint: "bbb", severity: "high" as const, category: "performance" as const, rule: "await-in-loop" },
    { fingerprint: "ccc", severity: "medium" as const, category: "maintainability" as const, rule: "cycle" },
    { fingerprint: undefined, severity: "medium" as const, category: "security" as const, rule: "old" },
  ];
  const facts = factsOf(issues);
  const inputs: ScoreInputs = { crit: 1, high: 1, med: 2, avgCx: 4, dupPct: 3, cycles: 5 };

  it("skips issues without a fingerprint", () => {
    expect(facts).toHaveLength(3);
  });

  it("takes each ignored finding out of its severity count, and cycles out of the cycle count", () => {
    expect(withoutFingerprints(inputs, facts, new Set(["aaa"]))).toEqual({ ...inputs, crit: 0 });
    expect(withoutFingerprints(inputs, facts, new Set(["bbb"]))).toEqual({ ...inputs, high: 0 });
    expect(withoutFingerprints(inputs, facts, new Set(["ccc"]))).toEqual({ ...inputs, med: 1, cycles: 4 });
  });

  it("does not change anything for unknown fingerprints, and never goes below zero", () => {
    expect(withoutFingerprints(inputs, facts, new Set(["zzz"]))).toEqual(inputs);
    expect(withoutFingerprints({ ...inputs, crit: 0 }, facts, new Set(["aaa"])).crit).toBe(0);
  });

  it("raises the score when a critical issue is ignored", () => {
    const raw = computeScore(inputs).score;
    expect(adjustedScore(inputs, facts, new Set(["aaa"])).score).toBeGreaterThan(raw);
    expect(adjustedScore(inputs, facts, new Set()).score).toBe(raw);
  });
});
