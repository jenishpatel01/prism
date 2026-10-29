import { afterEach, describe, expect, it, vi } from "vitest";
import { computeScore } from "@/lib/score";
import { analyzeWithToken } from "@/server/analysis";
import { makeTarball } from "./helpers/tarball";

/** Serves one fake repository from a mocked GitHub. */
function serve(files: Record<string, string>, commit = "a".repeat(40)) {
  const tar = makeTarball(files, commit);
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (/\/repos\/acme\/app$/.test(url)) {
      return Response.json({ name: "app", owner: { login: "acme" }, default_branch: "main", description: null, stargazers_count: 1, size: 10, private: false });
    }
    if (/\/tarball\//.test(url)) return new Response(new Uint8Array(tar));
    throw new Error(`unexpected request: ${url}`);
  });
}

async function analyze(files: Record<string, string>, commit?: string) {
  serve(files, commit);
  const out = await analyzeWithToken("acme", "app", "token");
  if (!out.ok) throw new Error(out.error);
  return out.result;
}

const APP = [
  "export function run(code: string) {",
  "  return eval(code);",
  "}",
  "",
  "export function load(db: any, ids: string[]) {",
  "  const out = [];",
  "  for (const id of ids) {",
  "    out.push(await db.findOne(id));",
  "  }",
  "  return out;",
  "}",
  "",
].join("\n");

afterEach(() => vi.restoreAllMocks());

describe("analysis end to end", () => {
  it("finds the planted problems and saves what is needed to rescore later", async () => {
    const r = await analyze({ "src/app.ts": APP });
    expect(r.issues.map((i) => i.rule).sort()).toEqual(["await-in-loop", "eval"]);
    expect(r.repo.commitFull).toBe("a".repeat(40));
    expect(r.repo.commit).toBe("aaaaaaa");
    expect(r.scoreVersion).toBe(1);
    expect(r.overflow).toBe(0);
    expect(r.scoreInputs).toMatchObject({ crit: 0, high: 2, med: 0, cycles: 0 });
    expect(computeScore(r.scoreInputs!).score).toBe(r.health.score);
    for (const i of r.issues) expect(i.fingerprint).toMatch(/^[0-9a-f]{12}$/);
  });

  it("keeps fingerprints when code above a finding moves it down (ids change, fingerprints do not)", async () => {
    const before = await analyze({ "src/app.ts": APP });
    vi.restoreAllMocks();
    const after = await analyze({ "src/app.ts": "// a new header comment\n// and another\nimport './util';\n" + APP, "src/util.ts": "export const x = 1;\n" });

    const fps = (r: typeof before) => r.issues.map((i) => i.fingerprint).sort();
    expect(fps(after)).toEqual(fps(before));
    // The old line-based ids all changed, which is why diff and triage can't use them.
    const ids = (r: typeof before) => new Set(r.issues.map((i) => i.id));
    for (const id of ids(after)) expect(ids(before).has(id)).toBe(false);
  });

  it("drops a fingerprint when the problem is fixed", async () => {
    const before = await analyze({ "src/app.ts": APP });
    vi.restoreAllMocks();
    const after = await analyze({ "src/app.ts": APP.replace("eval(code)", "JSON.parse(code)") });
    const evalFp = before.issues.find((i) => i.rule === "eval")!.fingerprint;
    expect(after.issues.map((i) => i.fingerprint)).not.toContain(evalFp);
    expect(after.issues).toHaveLength(1);
  });

  it("counts findings dropped by the 300-issue cap", async () => {
    const many = Array.from({ length: 320 }, (_, i) => `export function f${i}(c: string) { return eval(c); }`).join("\n");
    const r = await analyze({ "src/many.ts": many });
    expect(r.issues).toHaveLength(300);
    expect(r.overflow).toBe(20);
    expect(new Set(r.issues.map((i) => i.fingerprint)).size).toBe(300);
  });

  it("separates identical findings in one function", async () => {
    const r = await analyze({ "src/two.ts": "export function f(a: string) {\n  eval(a);\n  eval(a);\n}\n" });
    const fps = r.issues.filter((i) => i.rule === "eval").map((i) => i.fingerprint);
    expect(fps).toHaveLength(2);
    expect(new Set(fps).size).toBe(2);
  });

  it("finds a circular dependency and gives it a stable fingerprint", async () => {
    const files = { "src/a.ts": "import './b';\nexport const a = 1;\n", "src/b.ts": "import './a';\nexport const b = 1;\n" };
    const r1 = await analyze(files);
    vi.restoreAllMocks();
    const r2 = await analyze({ ...files, "src/a.ts": "// moved\n" + files["src/a.ts"] });
    const cyc = (r: typeof r1) => r.issues.filter((i) => i.rule === "cycle").map((i) => i.fingerprint);
    expect(cyc(r1)).toHaveLength(1);
    expect(cyc(r2)).toEqual(cyc(r1));
    expect(r1.scoreInputs!.cycles).toBe(1);
  });
});
