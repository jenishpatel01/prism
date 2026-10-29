import type { Category, Issue, Severity } from "./analysisTypes";

/*
 * The health score as a pure function, so it can be recomputed from saved
 * inputs, for example with a user's ignored findings taken out.
 */

/** Bump when the formula changes, so runs scored differently are never silently compared. */
export const SCORE_VERSION = 1;

export type ScoreInputs = {
  crit: number;
  high: number;
  med: number;
  /** Average cyclomatic complexity of production functions. */
  avgCx: number;
  /** Share of duplicated 6-line windows, in percent. */
  dupPct: number;
  /** Circular dependencies found (not capped at the 10 listed as issues). */
  cycles: number;
};

export function gradeOf(score: number) {
  if (score >= 93) return "A";
  if (score >= 88) return "A−";
  if (score >= 83) return "B+";
  if (score >= 77) return "B";
  if (score >= 70) return "B−";
  if (score >= 65) return "C+";
  if (score >= 58) return "C";
  if (score >= 50) return "D";
  return "F";
}

/** Starts at 100 and subtracts a penalty; every term has its own cap. */
export function computeScore(i: ScoreInputs): { score: number; grade: string } {
  const penalty =
    Math.min(40, i.crit * 8) +
    Math.min(25, (i.high * 25) / (i.high + 10)) +
    Math.min(15, (i.med * 15) / (i.med + 20)) +
    Math.min(12, Math.max(0, (i.avgCx - 4) * 3)) +
    Math.min(8, Math.max(0, i.dupPct - 3)) +
    Math.min(10, i.cycles * 2);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  return { score, grade: gradeOf(score) };
}

/** The compact per-issue facts saved with each analysis: enough to rescore without the full result. */
export type IssueFact = [fingerprint: string, severity: Severity, category: Category, rule: string];

export function factsOf(issues: Pick<Issue, "fingerprint" | "severity" | "category" | "rule">[]): IssueFact[] {
  return issues.flatMap((i) => (i.fingerprint ? [[i.fingerprint, i.severity, i.category, i.rule ?? ""] as IssueFact] : []));
}

/** Inputs with the given fingerprints (ignored findings) taken out of the counts. */
export function withoutFingerprints(inputs: ScoreInputs, facts: IssueFact[], skip: ReadonlySet<string>): ScoreInputs {
  const out = { ...inputs };
  for (const [fp, severity, , rule] of facts) {
    if (!skip.has(fp)) continue;
    if (severity === "critical") out.crit = Math.max(0, out.crit - 1);
    else if (severity === "high") out.high = Math.max(0, out.high - 1);
    else out.med = Math.max(0, out.med - 1);
    if (rule === "cycle") out.cycles = Math.max(0, out.cycles - 1);
  }
  return out;
}

/** Score of a saved analysis once the given fingerprints are ignored. */
export function adjustedScore(inputs: ScoreInputs, facts: IssueFact[], skip: ReadonlySet<string>) {
  return computeScore(skip.size ? withoutFingerprints(inputs, facts, skip) : inputs);
}
