/*
 * The shape of one PRISM analysis. Produced by the engine in src/server/analysis
 * and read by every dashboard screen. Plain JSON only, so it can be cached and
 * passed to client components.
 */

import type { ScoreInputs } from "./score";

export type Severity = "critical" | "high" | "medium";
export type Category = "security" | "performance" | "maintainability";

export type TriageState = "ignored" | "false_positive" | "accepted";

/** One user's decision about a finding. Never part of the shared, cached analysis. */
export type Triage = { state: TriageState; note?: string; expiresAt?: string; issueUrl?: string };

export type Issue = {
  id: string;
  /** The rule that found it, e.g. "eval" or "secret". Absent in results saved before fingerprints. */
  rule?: string;
  /** Identity that survives edits (no line number). Absent in results saved before fingerprints. */
  fingerprint?: string;
  severity: Severity;
  category: Category;
  title: string;
  location: string;
  source: string; // which analysis found it
  impact: string;
  risk: number; // 0–100
  detail?: string;
};

export type TriagedIssue = Issue & { triage: Triage };

export type GraphNode = {
  id: string; // file path
  group: string; // top-level folder, used for clustering and colour
  complexity: number;
  risk: number; // 0–100
};

export type RepoGraph = {
  groups: { name: string; color: string; count: number }[];
  nodes: GraphNode[];
  links: [number, number][]; // indexes into nodes
};

export type AnalysisResult = {
  demo: boolean;
  repo: {
    owner: string;
    name: string;
    branch: string;
    commit: string;
    /** Full commit id; `commit` is the first 7 characters. Absent in older results. */
    commitFull?: string;
    description?: string;
    stars?: number;
    private?: boolean;
    analyzedAt: string; // ISO time
    duration: string;
    languages: { name: string; pct: number; color: string }[];
  };
  health: { score: number; grade: string; previous?: number; history?: number[]; raw?: { score: number; grade: string } };
  stats: { label: string; value: string; delta?: string; good?: boolean | null }[];
  categories: { key: Category; label: string; count: number; color: string }[];
  severityCounts: { key: Severity; label: string; count: number }[];
  issues: Issue[]; // sorted by risk, highest first
  /** Findings the viewer has set aside; only present once the viewer's triage is applied. */
  triaged?: TriagedIssue[];
  /** Findings dropped by the 300-issue and per-rule caps. Comparisons are approximate when above zero. */
  overflow?: number;
  scoreVersion?: number;
  scoreInputs?: ScoreInputs;
  hotspots: { module: string; risk: number; complexity: number; churn?: number; fanIn?: number }[];
  quality: { label: string; value: string; unit: string; trend?: number[]; good: boolean; note?: string }[];
  pipeline: { stage: string; time: string; ai?: boolean; skipped?: boolean }[];
  summary: { headline: string; points: { text: string; evidence: string[] }[]; byClaude: boolean };
  history: { commit: string; message: string; when: string; score: number; issues: number }[];
  graph?: RepoGraph;
  notes: string[]; // limits and skipped steps, shown to the user
};
