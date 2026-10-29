import { describe, expect, it } from "vitest";
import { assignFingerprints, enclosingFunction, normalizeLine, patternSubject } from "@/server/analysis/fingerprint";

const item = (over: Partial<{ rule: string; path: string; line: number; subject: string }> = {}) => ({ rule: "eval", path: "src/a.ts", line: 10, subject: "run|eval(x)", ...over });

describe("assignFingerprints", () => {
  it("is deterministic", () => {
    const items = [item(), item({ path: "src/b.ts" })];
    expect(assignFingerprints(items)).toEqual(assignFingerprints(items));
  });

  it("does not depend on the line number", () => {
    expect(assignFingerprints([item({ line: 10 })])).toEqual(assignFingerprints([item({ line: 250 })]));
  });

  it("differs by rule, file and subject", () => {
    const [a, b, c, d] = assignFingerprints([item(), item({ rule: "new-function" }), item({ path: "src/b.ts" }), item({ subject: "other|eval(y)" })]);
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it("keeps identical findings in one file apart, in file order", () => {
    const [first, second] = assignFingerprints([item({ line: 5 }), item({ line: 9 })]);
    expect(first).not.toBe(second);
    // Moving both down keeps the same two fingerprints in the same order.
    const [first2, second2] = assignFingerprints([item({ line: 50 }), item({ line: 90 })]);
    expect([first2, second2]).toEqual([first, second]);
  });

  it("gives the same fingerprint to the same finding whatever order the input comes in", () => {
    const items = [item({ line: 5 }), item({ line: 9 }), item({ path: "src/z.ts", line: 1 })];
    const forward = assignFingerprints(items);
    const reversed = assignFingerprints([...items].reverse()).reverse();
    expect(reversed).toEqual(forward);
  });

  it("is 12 hex characters", () => {
    expect(assignFingerprints([item()])[0]).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("subjects", () => {
  const fns = [
    { name: "outer", line: 1, complexity: 1, length: 30 },
    { name: "inner", line: 10, complexity: 1, length: 5 },
  ];

  it("finds the innermost enclosing function", () => {
    expect(enclosingFunction(fns, 12)).toBe("inner");
    expect(enclosingFunction(fns, 20)).toBe("outer");
    expect(enclosingFunction(fns, 99)).toBe("");
  });

  it("ignores whitespace differences in the line", () => {
    expect(normalizeLine("   eval(  x )\t")).toBe("eval( x )");
    const lines = ["", "", "  eval( x )"];
    const other = ["", "", "eval( x )"];
    expect(patternSubject([], lines, 3)).toBe(patternSubject([], other, 3));
  });

  it("is empty for file-level findings with no line", () => {
    expect(patternSubject(fns, ["x"], 0)).toBe("");
  });
});
