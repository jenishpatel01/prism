/*
 * Demo analysis result for the app screens. The shape mirrors what PRISM's
 * pipeline will produce, so real data can replace this file later.
 * Everything here is invented example data.
 */

export type Severity = "critical" | "high" | "medium";
export type Category = "security" | "performance" | "maintainability";

export const repo = {
  owner: "acme",
  name: "storefront",
  branch: "main",
  commit: "9f3c2a1",
  analyzedAgo: "4 min ago",
  duration: "2m 51s",
  languages: [
    { name: "TypeScript", pct: 71, color: "#5b8cff" },
    { name: "Python", pct: 18, color: "#8d7cff" },
    { name: "SQL", pct: 7, color: "#5ee6ff" },
    { name: "Other", pct: 4, color: "#727989" },
  ],
};

export const health = {
  score: 72,
  previous: 66,
  grade: "B−",
  /** Weekly scores, oldest first. */
  history: [54, 58, 57, 61, 60, 64, 66, 72],
};

export const stats = [
  { label: "Files", value: "4,812", delta: "+38", good: null },
  { label: "Functions", value: "14,823", delta: "+212", good: null },
  { label: "Dependencies", value: "18,421", delta: "+96", good: null },
  { label: "Open issues", value: "23", delta: "−9", good: true },
] as const;

export const categories: { key: Category; label: string; count: number; color: string }[] = [
  { key: "security", label: "Security", count: 7, color: "var(--critical)" },
  { key: "performance", label: "Performance", count: 11, color: "var(--accent-cyan)" },
  { key: "maintainability", label: "Maintainability", count: 5, color: "var(--accent-violet)" },
];

export const severityCounts: { key: Severity; label: string; count: number }[] = [
  { key: "critical", label: "Critical", count: 4 },
  { key: "high", label: "High", count: 8 },
  { key: "medium", label: "Medium", count: 11 },
];

export type Issue = {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  location: string;
  source: string; // which analysis found it
  impact: string;
  risk: number;
};

export const issues: Issue[] = [
  {
    id: "PR-184",
    severity: "critical",
    category: "security",
    title: "SQL injection in user lookup",
    location: "src/api/users.ts:184",
    source: "Semgrep · taint trace",
    impact: "13 dependent modules",
    risk: 94,
  },
  {
    id: "PR-012",
    severity: "critical",
    category: "security",
    title: "Hardcoded payment secret",
    location: "src/config/payments.ts:12",
    source: "Secret scan",
    impact: "Exposed in 3 builds",
    risk: 91,
  },
  {
    id: "PR-077",
    severity: "critical",
    category: "performance",
    title: "N+1 query in OrderService.list()",
    location: "src/services/orders.ts:77",
    source: "Query profile",
    impact: "842ms p95",
    risk: 88,
  },
  {
    id: "PR-203",
    severity: "high",
    category: "security",
    title: "jsonwebtoken 8.5.1 has a known CVE",
    location: "package.json",
    source: "Dependency audit",
    impact: "Auth path",
    risk: 79,
  },
  {
    id: "PR-041",
    severity: "high",
    category: "maintainability",
    title: "calculateTotals() complexity 38",
    location: "src/checkout/totals.ts:41",
    source: "AST · cyclomatic",
    impact: "Changed 31× in 90 days",
    risk: 71,
  },
  {
    id: "PR-118",
    severity: "high",
    category: "maintainability",
    title: "Circular dependency: orders ↔ billing",
    location: "src/services/",
    source: "Dependency graph",
    impact: "2 modules, 46 imports",
    risk: 66,
  },
  {
    id: "PR-022",
    severity: "medium",
    category: "performance",
    title: "Unbounded cache in sessionStore",
    location: "src/lib/session.ts:22",
    source: "Static analysis",
    impact: "Memory growth",
    risk: 52,
  },
];

export const hotspots = [
  { module: "services/orders", risk: 88, complexity: 412, churn: 31 },
  { module: "api/users", risk: 82, complexity: 268, churn: 12 },
  { module: "checkout/totals", risk: 64, complexity: 301, churn: 31 },
  { module: "lib/session", risk: 41, complexity: 96, churn: 8 },
  { module: "components/cart", risk: 33, complexity: 154, churn: 19 },
];

export const quality = [
  { label: "Maintainability", value: "68", unit: "/100", trend: [58, 60, 61, 63, 62, 65, 68], good: true },
  { label: "Test coverage", value: "61", unit: "%", trend: [52, 54, 55, 57, 58, 60, 61], good: true },
  { label: "Duplication", value: "4.2", unit: "%", trend: [5.8, 5.6, 5.1, 4.9, 4.8, 4.4, 4.2], good: true },
  { label: "Avg complexity", value: "7.9", unit: "", trend: [7.1, 7.3, 7.6, 7.5, 7.8, 8.0, 7.9], good: false },
];

/** The deterministic pipeline, in run order. Claude only runs at the end. */
export const pipeline = [
  { stage: "Clone", time: "4s" },
  { stage: "Parse", time: "21s" },
  { stage: "AST", time: "18s" },
  { stage: "Static", time: "34s" },
  { stage: "Security", time: "29s" },
  { stage: "Graph", time: "12s" },
  { stage: "Profile", time: "25s" },
  { stage: "Quality", time: "9s" },
  { stage: "Claude", time: "14s", ai: true },
  { stage: "Visualize", time: "5s", ai: true },
];

export const summary = {
  headline: "Health is up 6 points. One fix removes the biggest risk.",
  points: [
    {
      text: "User input reaches a raw SQL query in users.ts on line 184. Thirteen modules sit on that path, including auth and admin. A parameterized query removes the risk without changing the API.",
      evidence: ["Semgrep taint trace", "Dependency graph"],
    },
    {
      text: "OrderService.list() runs one query per order. Batching it into a single indexed query cuts p95 from 842ms to about 127ms.",
      evidence: ["Query profile", "AST call graph"],
    },
    {
      text: "Last week's score gain came from splitting checkout logic. calculateTotals() is still the most complex function and changes most often; it is the next refactor to plan.",
      evidence: ["Complexity metrics", "Git churn"],
    },
  ],
};

export const history = [
  { commit: "9f3c2a1", message: "Merge pull request #482", when: "4 min ago", score: 72, issues: 23 },
  { commit: "b71e0d4", message: "Refactor checkout totals", when: "Yesterday", score: 69, issues: 27 },
  { commit: "3ac9f12", message: "Add billing webhooks", when: "3 days ago", score: 66, issues: 32 },
  { commit: "e0d55b8", message: "Upgrade Next.js", when: "6 days ago", score: 64, issues: 30 },
];

export const navCounts: Record<string, { value: number; tone: "critical" | "neutral" }> = {
  security: { value: 7, tone: "critical" },
  performance: { value: 11, tone: "neutral" },
};
