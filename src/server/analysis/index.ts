import { createHash } from "node:crypto";
import { cacheLife } from "next/cache";
import type { AnalysisResult, Category, Issue, RepoGraph, Severity } from "@/lib/analysisTypes";
import { SCORE_VERSION, computeScore } from "@/lib/score";
import { auditDependencies } from "./deps";
import { AnalysisError, downloadSource, getRepoInfo, type SourceFile } from "./fetchRepo";
import { assignFingerprints, patternSubject } from "./fingerprint";
import { buildGraph } from "./graph";
import { isCodeFile, parseFile, type FileFacts, type Finding } from "./parse";
import { scanSecrets } from "./secrets";

export type AnalyzeOutcome = { ok: true; result: AnalysisResult } | { ok: false; error: string; code: AnalysisError["code"] };

/**
 * Analyze a public GitHub repository. Cached per repo for a few hours, so
 * revisiting a dashboard is instant; failures are cached only briefly.
 */
export async function analyzeRepo(owner: string, name: string): Promise<AnalyzeOutcome> {
  "use cache";
  try {
    const result = await runAnalysis(owner, name);
    cacheLife("hours");
    return { ok: true, result };
  } catch (e) {
    cacheLife("minutes");
    if (e instanceof AnalysisError) return { ok: false, error: e.message, code: e.code };
    console.error("PRISM analysis failed", e);
    return { ok: false, error: "Something went wrong while analyzing this repository.", code: "invalid" };
  }
}

/**
 * Analyze with a signed-in user's token, so private repositories work.
 * Never cached in the shared cache: results are saved per user in the database instead.
 */
export async function analyzeWithToken(owner: string, name: string, token: string): Promise<AnalyzeOutcome> {
  try {
    return { ok: true, result: await runAnalysis(owner, name, token) };
  } catch (e) {
    if (e instanceof AnalysisError) return { ok: false, error: e.message, code: e.code };
    console.error("PRISM analysis failed", e);
    return { ok: false, error: "Something went wrong while analyzing this repository.", code: "invalid" };
  }
}

/* ------------------------------------------------------------------ */

const LANGS: [RegExp, string, string][] = [
  [/\.(ts|tsx)$/, "TypeScript", "#5b8cff"],
  [/\.(js|jsx|mjs|cjs)$/, "JavaScript", "#f5d76e"],
  [/\.py$/, "Python", "#8d7cff"],
  [/\.go$/, "Go", "#5ee6ff"],
  [/\.rs$/, "Rust", "#ff9a6b"],
  [/\.(java|kt)$/, "JVM", "#ff8f99"],
  [/\.rb$/, "Ruby", "#ff6b81"],
  [/\.php$/, "PHP", "#a9bcff"],
  [/\.(css|scss)$/, "CSS", "#c9a6ff"],
  [/\.(html|vue|svelte)$/, "Markup", "#4ade9a"],
  [/\.sql$/, "SQL", "#5ee6ff"],
];
const GROUP_COLORS = ["#a9bcff", "#8d7cff", "#5ee6ff", "#5b8cff", "#d6dcf5", "#4ade9a", "#c9a6ff"];

// Paths that are part of the repo but not the shipped product.
const NON_PROD = /(^|\/)(examples?|docs?|benchmarks?|bench|fixtures?|demos?|samples?|scripts)\//i;

const SEVERITY_BASE: Record<Severity, number> = { critical: 88, high: 64, medium: 40 };

const ms = (n: number) => (n < 1000 ? `${Math.max(1, Math.round(n))}ms` : `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}s`);
const fmt = (n: number) => n.toLocaleString("en-US");
const shortId = (s: string) => "PR-" + createHash("sha1").update(s).digest("hex").slice(0, 5).toUpperCase();

function moduleLabel(path: string) {
  return path.replace(/^(src|lib|app|packages)\//, "").replace(/\.(tsx?|jsx?|mjs|cjs|py)$/, "").replace(/\/index$/, "");
}

function groupOf(path: string) {
  const parts = path.split("/");
  if (parts.length === 1) return "root";
  if (["src", "lib", "app", "packages", "apps"].includes(parts[0]) && parts.length > 2) return parts[1];
  return parts[0];
}

/** Share of 6-line windows that appear more than once across code files. */
function duplication(files: SourceFile[]) {
  const seen = new Map<string, number>();
  let windows = 0;
  for (const f of files) {
    const lines = f.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 3 && !/^(import|from|export \{|\}|\);?|\/\/|#|\*)/.test(l));
    for (let i = 0; i + 6 <= lines.length; i++) {
      const key = createHash("md5").update(lines.slice(i, i + 6).join("\n")).digest("base64");
      seen.set(key, (seen.get(key) ?? 0) + 1);
      windows++;
    }
  }
  let dup = 0;
  for (const c of seen.values()) if (c > 1) dup += c;
  return windows ? (dup / windows) * 100 : 0;
}

async function runAnalysis(owner: string, name: string, token?: string): Promise<AnalysisResult> {
  const t0 = performance.now();
  const timings: Record<string, number> = {};
  const lap = (stage: string, start: number) => (timings[stage] = performance.now() - start);

  // 1. Clone
  let t = performance.now();
  const info = await getRepoInfo(owner, name, token);
  const { files, commit, skipped } = await downloadSource(info, token);
  lap("Clone", t);

  // 2. Parse + AST + pattern rules
  t = performance.now();
  const codeSources = files.filter((f) => isCodeFile(f.path));
  const facts: FileFacts[] = [];
  for (const f of codeSources) {
    try {
      facts.push(parseFile(f.path, f.text));
    } catch {
      // A file the parser can't read shouldn't stop the whole analysis.
    }
  }
  lap("Parse", t);

  // 3. Secrets
  t = performance.now();
  const secretFindings = scanSecrets(files);
  lap("Security", t);

  // 4. Dependency graph
  t = performance.now();
  const graph = buildGraph(facts);
  lap("Graph", t);

  // 5. Dependency audit (network)
  t = performance.now();
  const audit = await auditDependencies(files);
  lap("Deps", t);

  // 6. Quality metrics
  t = performance.now();
  // Tests, examples and docs are mapped but don't count toward quality or risk.
  const prodPaths = new Set(facts.filter((f) => !f.isTest && !NON_PROD.test(f.path)).map((f) => f.path));
  const isProd = (p: string) => prodPaths.has(p);
  const allFns = facts.flatMap((f) => f.functions.map((fn) => ({ ...fn, path: f.path })));
  const prodFns = allFns.filter((f) => isProd(f.path));
  const avgCx = prodFns.length ? prodFns.reduce((n, f) => n + f.complexity, 0) / prodFns.length : 0;
  const longFns = prodFns.filter((f) => f.length > 80).length;
  const prodSources = codeSources.filter((f) => isProd(f.path));
  const dupPct = duplication(prodSources);
  const testFiles = facts.filter((f) => f.isTest).length;
  const testRatio = facts.length ? (testFiles / facts.length) * 100 : 0;
  lap("Quality", t);

  /* ---------- Collect findings ---------- */

  type Raw = Finding & { path: string };
  const raw: Raw[] = [
    ...facts.filter((f) => isProd(f.path)).flatMap((f) => f.findings.map((x) => ({ ...x, path: f.path }))),
    ...secretFindings,
    ...audit.findings,
  ];

  // Complexity and size findings, worst first, capped so they don't drown real risks.
  let overflow = 0;
  const complexFns = allFns.filter((f) => f.complexity >= 15 && isProd(f.path)).sort((a, b) => b.complexity - a.complexity);
  overflow += Math.max(0, complexFns.length - 15);
  complexFns
    .slice(0, 15)
    .forEach((f) =>
      raw.push({
        path: f.path,
        rule: "complexity",
        subject: f.name,
        severity: f.complexity >= 25 ? "high" : "medium",
        category: "maintainability",
        title: f.name === "anonymous" ? `Anonymous function has complexity ${f.complexity}` : `${f.name}() has complexity ${f.complexity}`,
        line: f.line,
        source: "AST · cyclomatic",
        impact: `${f.length} lines long`,
      }),
    );

  const bigFiles = facts.filter((f) => f.lines > 800 && isProd(f.path)).sort((a, b) => b.lines - a.lines);
  overflow += Math.max(0, bigFiles.length - 5);
  bigFiles
    .slice(0, 5)
    .forEach((f) =>
      raw.push({
        path: f.path,
        rule: "large-file",
        subject: "",
        severity: "medium",
        category: "maintainability",
        title: `Large file: ${fmt(f.lines)} lines`,
        line: 0,
        source: "Size metrics",
        impact: `${f.functions.length} functions`,
      }),
    );

  overflow += Math.max(0, graph.cycles.length - 10);
  graph.cycles.slice(0, 10).forEach((cycle) => {
    const names = cycle.map((i) => moduleLabel(facts[i].path));
    raw.push({
      path: facts[cycle[0]].path,
      rule: "cycle",
      subject: cycle.map((i) => facts[i].path).sort().join(","),
      severity: cycle.length > 3 ? "high" : "medium",
      category: "maintainability",
      title: `Circular dependency: ${names.slice(0, 2).join(" ↔ ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`,
      line: 0,
      source: "Dependency graph",
      impact: `${cycle.length} files import each other`,
    });
  });

  const factIndex = new Map(facts.map((f, i) => [f.path, i]));
  const maxFanIn = Math.max(1, ...graph.fanIn);

  // Fingerprints name each problem independent of its line, so later comparisons and
  // "ignore" decisions survive edits. Pattern rules are identified by the function
  // they sit in plus the text of the line.
  const textOf = new Map(files.map((f) => [f.path, f.text]));
  const fnsOf = new Map(facts.map((f) => [f.path, f.functions]));
  const linesCache = new Map<string, string[]>();
  const linesOf = (path: string) => {
    let l = linesCache.get(path);
    if (!l) linesCache.set(path, (l = (textOf.get(path) ?? "").split("\n")));
    return l;
  };
  const fingerprints = assignFingerprints(
    raw.map((r) => ({ rule: r.rule, path: r.path, line: r.line, subject: r.subject ?? patternSubject(fnsOf.get(r.path) ?? [], linesOf(r.path), r.line) })),
  );

  const issues: Issue[] = raw
    .map((r, idx) => {
      const fi = factIndex.get(r.path);
      const reach = fi !== undefined ? graph.fanIn[fi] : 0;
      const risk = Math.min(99, Math.round(SEVERITY_BASE[r.severity] + (reach / maxFanIn) * 10 + (r.rule === "secret" ? 6 : 0)));
      return {
        id: shortId(`${r.path}:${r.line}:${r.rule}:${r.title}`),
        rule: r.rule,
        fingerprint: fingerprints[idx],
        severity: r.severity,
        category: r.category,
        title: r.title,
        location: r.line > 0 ? `${r.path}:${r.line}` : r.path,
        source: r.source,
        impact: reach > 2 && r.category === "security" ? `${reach} files import this` : r.impact,
        risk,
        detail: r.detail,
      };
    })
    .sort((a, b) => b.risk - a.risk);
  overflow += Math.max(0, issues.length - 300);
  issues.length = Math.min(issues.length, 300);

  const count = (s: Severity) => issues.filter((i) => i.severity === s).length;
  const countCat = (c: Category) => issues.filter((i) => i.category === c).length;
  const crit = count("critical");
  const high = count("high");
  const med = count("medium");

  /* ---------- Score ---------- */

  const scoreInputs = { crit, high, med, avgCx, dupPct, cycles: graph.cycles.length };
  const { score, grade } = computeScore(scoreInputs);

  /* ---------- Hotspots ---------- */

  const fileCx = facts.map((f) => f.functions.reduce((n, fn) => n + fn.complexity, 0));
  const maxCx = Math.max(1, ...fileCx);
  const fileIssueWeight = new Map<string, number>();
  for (const r of raw) {
    const w = r.severity === "critical" ? 25 : r.severity === "high" ? 12 : 5;
    fileIssueWeight.set(r.path, Math.min(40, (fileIssueWeight.get(r.path) ?? 0) + w));
  }
  const fileRisk = facts.map((f, i) =>
    Math.min(99, Math.round((fileCx[i] / maxCx) * 45 + (fileIssueWeight.get(f.path) ?? 0) + (graph.fanIn[i] / maxFanIn) * 15)),
  );
  const hotspots = facts
    .map((f, i) => ({ module: moduleLabel(f.path), risk: fileRisk[i], complexity: fileCx[i], fanIn: graph.fanIn[i], test: !isProd(f.path) }))
    .filter((h) => !h.test)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5)
    .map((h) => ({ module: h.module, risk: h.risk, complexity: h.complexity, fanIn: h.fanIn }));

  /* ---------- Languages ---------- */

  const bytesBy = new Map<string, { bytes: number; color: string }>();
  let totalBytes = 0;
  for (const f of files) {
    const hit = LANGS.find(([re]) => re.test(f.path));
    if (!hit) continue;
    const cur = bytesBy.get(hit[1]) ?? { bytes: 0, color: hit[2] };
    cur.bytes += f.bytes;
    bytesBy.set(hit[1], cur);
    totalBytes += f.bytes;
  }
  const langs = [...bytesBy.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
  const top = langs.slice(0, 3).filter(([, v]) => v.bytes / Math.max(1, totalBytes) >= 0.01).map(([n, v]) => ({ name: n, pct: Math.round((v.bytes / Math.max(1, totalBytes)) * 100), color: v.color }));
  const rest = 100 - top.reduce((n, l) => n + l.pct, 0);
  const languages = rest > 0 && langs.length > top.length ? [...top, { name: "Other", pct: rest, color: "#727989" }] : top;

  /* ---------- 3D graph ---------- */

  t = performance.now();
  const ranked = facts
    .map((f, i) => ({ i, weight: fileCx[i] + graph.fanIn[i] * 3 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 700);
  const keep = new Map(ranked.map((r, k) => [r.i, k]));
  const groupCounts = new Map<string, number>();
  ranked.forEach((r) => groupCounts.set(groupOf(facts[r.i].path), (groupCounts.get(groupOf(facts[r.i].path)) ?? 0) + 1));
  const topGroups = [...groupCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g]) => g);
  const groupName = (p: string) => (topGroups.includes(groupOf(p)) ? groupOf(p) : "other");
  const nodes = ranked.map((r) => ({ id: facts[r.i].path, group: groupName(facts[r.i].path), complexity: fileCx[r.i], risk: fileRisk[r.i] }));
  const groupsUsed = [...new Set(nodes.map((n) => n.group))];
  const repoGraph: RepoGraph = {
    groups: groupsUsed.map((g, k) => ({ name: g, color: g === "other" ? "#727989" : GROUP_COLORS[k % GROUP_COLORS.length], count: nodes.filter((n) => n.group === g).length })),
    nodes,
    links: graph.links.filter(([a, b]) => keep.has(a) && keep.has(b)).map(([a, b]) => [keep.get(a)!, keep.get(b)!] as [number, number]),
  };
  lap("Visualize", t);

  /* ---------- Summary (from facts; Claude adds explanations in phase 2) ---------- */

  const topIssues = issues.slice(0, 3);
  const headline =
    crit > 0
      ? `${crit} critical issue${crit > 1 ? "s" : ""} need${crit > 1 ? "" : "s"} attention first.`
      : high > 0
        ? `No critical issues. ${high} high-severity finding${high > 1 ? "s" : ""} to review.`
        : "No critical or high-severity issues found.";
  const points = topIssues.map((i) => ({
    text: `${i.title} at ${i.location}. ${i.impact}.${i.detail ? " " + i.detail : ""}`,
    evidence: [...new Set([i.source, ...(i.impact.includes("import") ? ["Dependency graph"] : [])])],
  }));
  if (points.length < 3 && hotspots[0]) {
    points.push({
      text: `${hotspots[0].module} is the riskiest module: complexity ${hotspots[0].complexity}, imported by ${hotspots[0].fanIn} files. Changes there carry the most weight.`,
      evidence: ["Complexity metrics", "Dependency graph"],
    });
  }

  const externalDeps = audit.count;
  const notes: string[] = [];
  if (skipped) notes.push(`${fmt(skipped)} non-source or very large files were skipped.`);
  if (!audit.ok) notes.push("The dependency vulnerability check couldn't reach OSV.dev, so it was skipped.");
  if (!facts.length) notes.push("No JavaScript, TypeScript or Python files were found; code-level checks only cover those languages for now.");
  notes.push("Git history isn't analyzed yet, so change frequency (churn) isn't included in risk.");

  return {
    demo: false,
    repo: {
      owner: info.owner,
      name: info.name,
      branch: info.branch,
      commit: commit ? commit.slice(0, 7) : "latest",
      commitFull: commit || undefined,
      description: info.description,
      stars: info.stars,
      private: info.private,
      analyzedAt: new Date().toISOString(),
      duration: ms(performance.now() - t0),
      languages,
    },
    health: { score, grade },
    scoreInputs,
    scoreVersion: SCORE_VERSION,
    overflow,
    stats: [
      { label: "Code files", value: fmt(facts.length) },
      { label: "Functions", value: fmt(allFns.length) },
      { label: "Dependencies", value: fmt(graph.links.length + externalDeps), delta: `${fmt(externalDeps)} external`, good: null },
      { label: "Open issues", value: fmt(issues.length), delta: crit ? `${crit} critical` : undefined, good: crit ? false : null },
    ],
    categories: [
      { key: "security", label: "Security", count: countCat("security"), color: "var(--critical)" },
      { key: "performance", label: "Performance", count: countCat("performance"), color: "var(--accent-cyan)" },
      { key: "maintainability", label: "Maintainability", count: countCat("maintainability"), color: "var(--accent-violet)" },
    ],
    severityCounts: [
      { key: "critical", label: "Critical", count: crit },
      { key: "high", label: "High", count: high },
      { key: "medium", label: "Medium", count: med },
    ],
    issues,
    hotspots,
    quality: [
      { label: "Maintainability", value: String(Math.max(0, Math.round(100 - Math.max(0, avgCx - 1) * 4 - (longFns / Math.max(1, allFns.length)) * 100 * 0.5 - dupPct * 1.5))), unit: "/100", good: true },
      { label: "Test files", value: testRatio.toFixed(0), unit: "%", good: testRatio >= 15, note: "Share of code files that are tests" },
      { label: "Duplication", value: dupPct.toFixed(1), unit: "%", good: dupPct < 5 },
      { label: "Avg complexity", value: avgCx.toFixed(1), unit: "", good: avgCx < 6 },
    ],
    // Every time here is measured. Parsing, AST rules and complexity run in one pass.
    pipeline: [
      { stage: "Clone", time: ms(timings.Clone) },
      { stage: "Parse + AST", time: ms(timings.Parse) },
      { stage: "Secrets", time: ms(timings.Security) },
      { stage: "Graph", time: ms(timings.Graph) },
      { stage: "Deps", time: ms(timings.Deps) },
      { stage: "Quality", time: ms(timings.Quality) },
      { stage: "AI", time: "Phase 2", ai: true, skipped: true },
      { stage: "Visualize", time: ms(timings.Visualize), ai: true },
    ],
    summary: { headline, points, byClaude: false },
    history: [],
    graph: repoGraph,
    notes,
  };
}
