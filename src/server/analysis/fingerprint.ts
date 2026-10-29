import { createHash } from "node:crypto";
import type { FunctionFact } from "./parse";

/*
 * A fingerprint names one problem across commits. It is built from what the
 * problem is (rule, file, a "subject"), never from where it sits (line number),
 * so editing code above a finding doesn't turn it into a "new" one.
 */

export type FingerprintInput = { rule: string; path: string; line: number; subject: string };

export function normalizeLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Name of the innermost function that contains the line, or "" at file level. */
export function enclosingFunction(fns: FunctionFact[], line: number) {
  let best: FunctionFact | undefined;
  for (const f of fns) {
    if (line >= f.line && line <= f.line + f.length - 1 && (!best || f.line >= best.line)) best = f;
  }
  return best?.name ?? "";
}

/** Subject for pattern rules: the function it sits in plus the (whitespace-normalised) line itself. */
export function patternSubject(fns: FunctionFact[], lines: string[], line: number) {
  if (line <= 0) return "";
  return `${enclosingFunction(fns, line)}|${normalizeLine(lines[line - 1] ?? "")}`;
}

/**
 * One fingerprint per item, in the same order. Items that share rule, file and
 * subject are told apart by their order in the file, so two identical lines in
 * one function stay two separate problems.
 */
export function assignFingerprints(items: FingerprintInput[]): string[] {
  const order = items
    .map((_, i) => i)
    .sort((a, b) => {
      const x = items[a];
      const y = items[b];
      return x.path < y.path ? -1 : x.path > y.path ? 1 : x.line - y.line || a - b;
    });
  const seen = new Map<string, number>();
  const out = new Array<string>(items.length);
  for (const i of order) {
    const it = items[i];
    const key = [it.rule, it.path, it.subject].join("\0");
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out[i] = createHash("sha1").update(`${key}\0${n}`).digest("hex").slice(0, 12);
  }
  return out;
}
