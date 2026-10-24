import type { AnalysisResult, RepoGraph } from "./analysisTypes";

/*
 * Demo analysis shown at /app before a real repository is analyzed.
 * Same shape the engine produces. Everything here is invented example data.
 */

export const demoResult: AnalysisResult = {
  demo: true,
  repo: {
    owner: "acme",
    name: "storefront",
    branch: "main",
    commit: "9f3c2a1",
    analyzedAt: "2026-10-24T09:00:00.000Z",
    duration: "2m 51s",
    languages: [
      { name: "TypeScript", pct: 71, color: "#5b8cff" },
      { name: "Python", pct: 18, color: "#8d7cff" },
      { name: "SQL", pct: 7, color: "#5ee6ff" },
      { name: "Other", pct: 4, color: "#727989" },
    ],
  },
  health: { score: 72, previous: 66, grade: "B−", history: [54, 58, 57, 61, 60, 64, 66, 72] },
  stats: [
    { label: "Files", value: "4,812", delta: "+38", good: null },
    { label: "Functions", value: "14,823", delta: "+212", good: null },
    { label: "Dependencies", value: "18,421", delta: "+96", good: null },
    { label: "Open issues", value: "23", delta: "−9", good: true },
  ],
  categories: [
    { key: "security", label: "Security", count: 7, color: "var(--critical)" },
    { key: "performance", label: "Performance", count: 11, color: "var(--accent-cyan)" },
    { key: "maintainability", label: "Maintainability", count: 5, color: "var(--accent-violet)" },
  ],
  severityCounts: [
    { key: "critical", label: "Critical", count: 4 },
    { key: "high", label: "High", count: 8 },
    { key: "medium", label: "Medium", count: 11 },
  ],
  issues: [
    { id: "PR-184", severity: "critical", category: "security", title: "SQL injection in user lookup", location: "src/api/users.ts:184", source: "Semgrep · taint trace", impact: "13 dependent modules", risk: 94 },
    { id: "PR-012", severity: "critical", category: "security", title: "Hardcoded payment secret", location: "src/config/payments.ts:12", source: "Secret scan", impact: "Exposed in 3 builds", risk: 91 },
    { id: "PR-077", severity: "critical", category: "performance", title: "N+1 query in OrderService.list()", location: "src/services/orders.ts:77", source: "Query profile", impact: "842ms p95", risk: 88 },
    { id: "PR-203", severity: "high", category: "security", title: "jsonwebtoken 8.5.1 has a known CVE", location: "package.json", source: "Dependency audit", impact: "Auth path", risk: 79 },
    { id: "PR-041", severity: "high", category: "maintainability", title: "calculateTotals() complexity 38", location: "src/checkout/totals.ts:41", source: "AST · cyclomatic", impact: "Changed 31× in 90 days", risk: 71 },
    { id: "PR-118", severity: "high", category: "maintainability", title: "Circular dependency: orders ↔ billing", location: "src/services/", source: "Dependency graph", impact: "2 modules, 46 imports", risk: 66 },
    { id: "PR-022", severity: "medium", category: "performance", title: "Unbounded cache in sessionStore", location: "src/lib/session.ts:22", source: "Static analysis", impact: "Memory growth", risk: 52 },
  ],
  hotspots: [
    { module: "services/orders", risk: 88, complexity: 412, churn: 31 },
    { module: "api/users", risk: 82, complexity: 268, churn: 12 },
    { module: "checkout/totals", risk: 64, complexity: 301, churn: 31 },
    { module: "lib/session", risk: 41, complexity: 96, churn: 8 },
    { module: "components/cart", risk: 33, complexity: 154, churn: 19 },
  ],
  quality: [
    { label: "Maintainability", value: "68", unit: "/100", trend: [58, 60, 61, 63, 62, 65, 68], good: true },
    { label: "Test coverage", value: "61", unit: "%", trend: [52, 54, 55, 57, 58, 60, 61], good: true },
    { label: "Duplication", value: "4.2", unit: "%", trend: [5.8, 5.6, 5.1, 4.9, 4.8, 4.4, 4.2], good: true },
    { label: "Avg complexity", value: "7.9", unit: "", trend: [7.1, 7.3, 7.6, 7.5, 7.8, 8.0, 7.9], good: false },
  ],
  pipeline: [
    { stage: "Clone", time: "4s" },
    { stage: "Parse", time: "21s" },
    { stage: "AST", time: "18s" },
    { stage: "Static", time: "34s" },
    { stage: "Security", time: "29s" },
    { stage: "Graph", time: "12s" },
    { stage: "Profile", time: "25s" },
    { stage: "Quality", time: "9s" },
    { stage: "AI", time: "14s", ai: true },
    { stage: "Visualize", time: "5s", ai: true },
  ],
  summary: {
    headline: "Health is up 6 points. One fix removes the biggest risk.",
    byClaude: true,
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
  },
  history: [
    { commit: "9f3c2a1", message: "Merge pull request #482", when: "4 min ago", score: 72, issues: 23 },
    { commit: "b71e0d4", message: "Refactor checkout totals", when: "Yesterday", score: 69, issues: 27 },
    { commit: "3ac9f12", message: "Add billing webhooks", when: "3 days ago", score: 66, issues: 32 },
    { commit: "e0d55b8", message: "Upgrade Next.js", when: "6 days ago", score: 64, issues: 30 },
  ],
  notes: [],
};

export const demoNavCounts: Record<string, { value: number; tone: "critical" | "neutral" }> = {
  security: { value: 7, tone: "critical" },
  performance: { value: 11, tone: "neutral" },
};

/* ---------------- Demo repository graph (for the explorer and map) ---------------- */


function demoGraph(): RepoGraph {
  let s = 42;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const layers: { name: string; color: string; files: string[] }[] = [
    { name: "app", color: "#a9bcff", files: ["page", "layout", "cart/page", "checkout/page", "account/page", "orders/page", "search/page", "product/page", "login/page", "admin/page"].map((f) => `src/app/${f}.tsx`) },
    { name: "components", color: "#d6dcf5", files: ["Button", "Cart", "CartItem", "Checkout", "Header", "Footer", "ProductCard", "ProductGrid", "SearchBar", "Modal", "Price", "AddressForm", "PaymentForm", "OrderList", "Avatar", "Toast"].map((f) => `src/components/${f}.tsx`) },
    { name: "services", color: "#8d7cff", files: ["orders", "billing", "inventory", "shipping", "email", "search", "users", "promotions"].map((f) => `src/services/${f}.ts`) },
    { name: "api", color: "#5ee6ff", files: ["users", "orders", "payments", "products", "webhooks", "auth", "search"].map((f) => `src/api/${f}.ts`) },
    { name: "lib", color: "#5b8cff", files: ["db", "session", "cache", "logger", "config", "validation"].map((f) => `src/lib/${f}.ts`) },
  ];
  const risky = new Set(["src/api/users.ts", "src/services/orders.ts", "src/config/payments.ts", "src/api/payments.ts", "src/checkout/totals.ts"]);
  const nodes: RepoGraph["nodes"] = [];
  layers.forEach((l) =>
    l.files.forEach((id) => nodes.push({ id, group: l.name, complexity: Math.round(8 + Math.pow(rand(), 2) * 160), risk: risky.has(id) ? 88 : Math.round(rand() * 55) })),
  );
  const at = (layer: number) => nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.group === layers[layer].name);
  const links: [number, number][] = [];
  layers.forEach((_, li) => {
    const here = at(li);
    const next = at(Math.min(li + 1, layers.length - 1));
    here.forEach(({ i }) => {
      for (let k = 0; k < 2; k++) {
        const t = next[Math.floor(rand() * next.length)].i;
        if (t !== i) links.push([i, t]);
      }
      if (rand() < 0.5) {
        const t = here[Math.floor(rand() * here.length)].i;
        if (t !== i) links.push([i, t]);
      }
    });
  });
  return {
    groups: layers.map((l) => ({ name: l.name, color: l.color, count: l.files.length })),
    nodes,
    links,
  };
}

demoResult.graph = demoGraph();

/** Sample Claude review for the demo workspace's AI Review screen. */
export const demoReview = {
  model: "claude-sonnet-5-5 (sample)",
  headline: "Fix the SQL injection in users.ts first; it sits on the auth path.",
  overview:
    "The codebase is in reasonable shape (72/100) and improving, but three critical findings carry most of the risk. Two are security issues on paths that auth and admin depend on; the third is a query pattern that dominates checkout latency.",
  points: [],
  reviews: [
    { issueId: "PR-184", priority: "now" as const, falsePositiveRisk: "low" as const, explanation: "User input from the lookup endpoint reaches a raw SQL string. Because auth and admin import this module, one injectable query exposes every caller.", fix: "Replace the template string with a parameterized query (db.query(sql, [id])) or your query builder's where() helper. No API change is needed." },
    { issueId: "PR-012", priority: "now" as const, falsePositiveRisk: "low" as const, explanation: "A live payment secret is committed in source, so anyone with read access to the repository or its build artifacts can use it.", fix: "Rotate the key in your payment dashboard today, move it to an environment variable, and purge it from git history." },
    { issueId: "PR-077", priority: "soon" as const, falsePositiveRisk: "low" as const, explanation: "OrderService.list() awaits one query per order, so latency grows with order count and dominates p95.", fix: "Fetch all orders in one query with WHERE id IN (...) or a join, and add an index on orders.user_id." },
    { issueId: "PR-203", priority: "soon" as const, falsePositiveRisk: "medium" as const, explanation: "This jsonwebtoken version has a published advisory. Whether it's exploitable depends on how tokens are verified.", fix: "Upgrade to the latest major version and pin the allowed algorithms in jwt.verify()." },
    { issueId: "PR-041", priority: "later" as const, falsePositiveRisk: "low" as const, explanation: "calculateTotals() has 38 independent paths and changes often, which makes pricing bugs likely.", fix: "Split tax, discount and shipping into separate pure functions with their own tests, then compose them." },
    { issueId: "PR-118", priority: "later" as const, falsePositiveRisk: "low" as const, explanation: "orders and billing import each other, so neither can change or be tested in isolation.", fix: "Move the shared types into a small module both depend on, or have billing emit events that orders subscribes to." },
  ],
};
