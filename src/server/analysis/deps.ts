import type { SourceFile } from "./fetchRepo";
import type { Finding } from "./parse";

/*
 * Dependency audit: reads package manifests and asks OSV.dev (Google's free,
 * open vulnerability database) which pinned versions have known advisories.
 */

type Dep = { name: string; version: string; ecosystem: "npm" | "PyPI"; manifest: string };

function npmDeps(files: SourceFile[]): Dep[] {
  const out: Dep[] = [];
  const lock = files.find((f) => f.path === "package-lock.json");
  const pkg = files.find((f) => f.path === "package.json");
  let direct: Record<string, string> = {};
  try {
    if (pkg) {
      const j = JSON.parse(pkg.text);
      direct = { ...(j.dependencies ?? {}), ...(j.devDependencies ?? {}) };
    }
  } catch {}

  let locked: Record<string, { version?: string }> = {};
  try {
    if (lock) locked = JSON.parse(lock.text).packages ?? {};
  } catch {}

  for (const [name, range] of Object.entries(direct)) {
    const version = locked[`node_modules/${name}`]?.version ?? String(range).replace(/^[\^~>=<\s]+/, "").split(" ")[0];
    if (/^\d+\.\d+/.test(version)) out.push({ name, version, ecosystem: "npm", manifest: "package.json" });
  }
  return out;
}

function pyDeps(files: SourceFile[]): Dep[] {
  const out: Dep[] = [];
  for (const f of files.filter((f) => /(^|\/)requirements[^/]*\.txt$/.test(f.path))) {
    for (const line of f.text.split("\n")) {
      const m = line.trim().match(/^([A-Za-z0-9_.\-]+)\s*==\s*([0-9][^\s;#]*)/);
      if (m) out.push({ name: m[1], version: m[2], ecosystem: "PyPI", manifest: f.path });
    }
  }
  return out;
}

const SEVERITY: Record<string, Finding["severity"]> = { CRITICAL: "critical", HIGH: "high", MODERATE: "medium", MEDIUM: "medium", LOW: "medium" };

export async function auditDependencies(files: SourceFile[]): Promise<{ findings: (Finding & { path: string })[]; count: number; ok: boolean }> {
  const deps = [...npmDeps(files), ...pyDeps(files)].slice(0, 500);
  if (!deps.length) return { findings: [], count: 0, ok: true };

  try {
    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: deps.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version })) }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return { findings: [], count: deps.length, ok: false };
    const data = (await res.json()) as { results: { vulns?: { id: string }[] }[] };

    const hits = deps
      .map((d, i) => ({ dep: d, ids: (data.results[i]?.vulns ?? []).map((v) => v.id) }))
      .filter((h) => h.ids.length);

    // Fetch details (severity, summary) for the first advisory of up to 12 packages.
    const findings = await Promise.all(
      hits.slice(0, 12).map(async ({ dep, ids }) => {
        let severity: Finding["severity"] = "high";
        let summary = "";
        try {
          const v = await fetch(`https://api.osv.dev/v1/vulns/${ids[0]}`, { signal: AbortSignal.timeout(6_000), cache: "no-store" }).then((r) => r.json());
          severity = SEVERITY[String(v?.database_specific?.severity ?? "").toUpperCase()] ?? "high";
          summary = v?.summary ?? "";
        } catch {}
        return {
          path: dep.manifest,
          rule: "vulnerable-dependency",
          severity,
          category: "security" as const,
          title: `${dep.name} ${dep.version} has ${ids.length === 1 ? "a known vulnerability" : `${ids.length} known vulnerabilities`}`,
          line: 0,
          source: `OSV · ${ids[0]}`,
          impact: summary ? (summary.length > 90 ? summary.slice(0, 88).trimEnd() + "…" : summary) : "Upgrade recommended",
        };
      }),
    );
    return { findings, count: deps.length, ok: true };
  } catch {
    return { findings: [], count: deps.length, ok: false };
  }
}
