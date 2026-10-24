import type { AnalysisResult } from "@/lib/analysisTypes";
import { IssueRow } from "../overview/Widgets";
import { PageHeader, Panel } from "../ui";

/*
 * Architecture map built from the real import graph. Folders become layers,
 * ordered so code that imports others sits above the code it depends on.
 * Imports that point upward (a foundation importing a caller) break that
 * layering and are flagged.
 */

const W = 960;
const ROW = 120;
const LEFT = 170;

export default function ArchitectureView({ data, base }: { data: AnalysisResult; base: string }) {
  void base;
  const repo = { ...data.repo, demo: data.demo };
  const graph = data.graph;

  if (!graph || !graph.nodes.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Architecture" description="Layers, dependencies and risky modules, from the import graph." repo={repo} />
        <Panel>
          <p className="text-[14px] text-fg-muted">No import graph was found for this repository, so there&apos;s no architecture to draw yet.</p>
        </Panel>
      </div>
    );
  }

  const groups = graph.groups.map((g) => g.name);
  const gi = new Map(groups.map((g, i) => [g, i]));
  const nodeGroup = graph.nodes.map((n) => gi.get(n.group) ?? 0);

  // Group-to-group import counts.
  const flow = groups.map(() => groups.map(() => 0));
  for (const [a, b] of graph.links) {
    const ga = nodeGroup[a];
    const gb = nodeGroup[b];
    if (ga !== gb) flow[ga][gb]++;
  }
  // Order layers: the more a group imports others (and the less it's imported), the higher it sits.
  const order = groups
    .map((_, i) => ({ i, score: flow[i].reduce((n, v) => n + v, 0) - flow.reduce((n, row) => n + row[i], 0) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
  const rank = new Map(order.map((g, r) => [g, r]));
  const H = order.length * ROW + 40;
  const rowY = (g: number) => 60 + rank.get(g)! * ROW;

  // Top modules per layer, sized by complexity.
  const maxCx = Math.max(1, ...graph.nodes.map((n) => n.complexity));
  const modules = order.map((g) => {
    const members = graph.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ i }) => nodeGroup[i] === g)
      .sort((a, b) => b.n.complexity - a.n.complexity)
      .slice(0, 9);
    const span = W - LEFT - 60;
    return members.map(({ n }, k) => ({
      x: LEFT + 30 + (members.length === 1 ? span / 2 : (k / (members.length - 1)) * span),
      y: rowY(g),
      r: 5 + Math.sqrt(n.complexity / maxCx) * 17,
      n,
      label: k < 3 ? n.id.split("/").pop()!.replace(/\.(tsx?|jsx?|py|mjs|cjs)$/, "") : null,
    }));
  });

  // Layer-to-layer bands. Upward imports (from a lower layer to a higher one) are violations.
  const bands: { from: number; to: number; count: number; upward: boolean }[] = [];
  groups.forEach((_, a) =>
    groups.forEach((__, b) => {
      if (flow[a][b]) bands.push({ from: a, to: b, count: flow[a][b], upward: rank.get(a)! > rank.get(b)! });
    }),
  );
  const maxFlow = Math.max(1, ...bands.map((b) => b.count));
  const violations = bands.filter((b) => b.upward);

  const stats = order.map((g) => {
    const idx = graph.nodes.map((_, i) => i).filter((i) => nodeGroup[i] === g);
    const cx = idx.reduce((n, i) => n + graph.nodes[i].complexity, 0);
    const risk = idx.length ? Math.round(idx.reduce((n, i) => n + graph.nodes[i].risk, 0) / idx.length) : 0;
    return {
      name: groups[g],
      color: graph.groups[g].color,
      files: idx.length,
      complexity: cx,
      risk,
      out: flow[g].reduce((n, v) => n + v, 0),
      in: flow.reduce((n, row) => n + row[g], 0),
    };
  });

  const cycles = data.issues.filter((i) => i.title.startsWith("Circular dependency"));

  return (
    <div className="space-y-6">
      <PageHeader title="Architecture" description="Layers, dependencies and risky modules, built from the real import graph." repo={repo} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        {[
          ["Layers", String(order.length)],
          ["Files mapped", String(graph.nodes.length)],
          ["Cross-layer imports", String(bands.reduce((n, b) => n + b.count, 0))],
          ["Layering breaks", String(violations.reduce((n, b) => n + b.count, 0))],
        ].map(([k, v]) => (
          <div key={k} className="bg-bg-1/90 px-5 py-4">
            <p className="label">{k}</p>
            <p className={`mt-2 font-mono text-[24px] ${k === "Layering breaks" && v !== "0" ? "text-warning" : "text-white"}`}>{v}</p>
          </div>
        ))}
      </div>

      <Panel title="Layer map">
        <div className="-mx-5 overflow-x-auto px-5">
          <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[720px]" role="img" aria-label="Architecture layers and the imports between them">
            {/* Bands between layers */}
            {bands.map((b) => {
              const y1 = rowY(b.from);
              const y2 = rowY(b.to);
              const x = LEFT + 30 + ((b.from * 37 + b.to * 61) % 7) * ((W - LEFT - 60) / 7) + 40;
              const mid = (y1 + y2) / 2;
              const d = `M${x} ${y1} C${x + (b.upward ? 90 : -40)} ${mid} ${x + (b.upward ? 90 : 40)} ${mid} ${x + 20} ${y2}`;
              return (
                <path
                  key={`${b.from}-${b.to}`}
                  d={d}
                  fill="none"
                  stroke={b.upward ? "var(--warning)" : "rgb(157 141 255 / 0.55)"}
                  strokeWidth={1 + (b.count / maxFlow) * 7}
                  strokeOpacity={b.upward ? 0.75 : 0.5}
                  strokeDasharray={b.upward ? "6 6" : undefined}
                  className={b.upward ? undefined : "flow"}
                >
                  <title>{`${groups[b.from]} → ${groups[b.to]}: ${b.count} imports${b.upward ? " (upward: breaks layering)" : ""}`}</title>
                </path>
              );
            })}

            {/* Layers */}
            {order.map((g, r) => (
              <g key={groups[g]}>
                <line x1={LEFT} y1={rowY(g)} x2={W - 20} y2={rowY(g)} stroke="var(--line)" strokeDasharray="2 7" />
                <text x={0} y={rowY(g) - 6} className="font-mono" fontSize="13" fill="var(--fg)" letterSpacing="1.5">
                  {groups[g].toUpperCase()}
                </text>
                <text x={0} y={rowY(g) + 12} className="font-mono" fontSize="11" fill="var(--fg-dim)">
                  {stats[r].files} files · layer {r + 1}
                </text>
                {modules[r].map((m) => (
                  <g key={m.n.id}>
                    {m.n.risk >= 70 && <circle cx={m.x} cy={m.y} r={m.r} fill="none" stroke="var(--critical)" strokeWidth="1.5" className="pulse-ring" />}
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={m.r}
                      fill={m.n.risk >= 70 ? "rgb(255 77 94 / 0.25)" : `${graph.groups[g].color}33`}
                      stroke={m.n.risk >= 70 ? "var(--critical)" : graph.groups[g].color}
                      strokeWidth="1.4"
                    >
                      <title>{`${m.n.id}\ncomplexity ${m.n.complexity} · risk ${m.n.risk}`}</title>
                    </circle>
                    <circle cx={m.x} cy={m.y} r={Math.max(2, m.r * 0.25)} fill="#fff" />
                    {m.label && (
                      <text x={m.x} y={m.y + m.r + 15} textAnchor="middle" className="font-mono" fontSize="11" fill={m.n.risk >= 70 ? "#ff8f99" : "var(--fg-muted)"}>
                        {m.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-fg-dim">
          <span>Circles: the most complex modules per layer, sized by complexity.</span>
          <span className="text-warning">Dashed amber: upward imports that break layering.</span>
          <span>Hover for details.</span>
        </p>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Layers">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-line font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-dim">
                  <th className="px-5 py-2 font-normal">Layer</th>
                  <th className="px-3 py-2 text-right font-normal">Files</th>
                  <th className="px-3 py-2 text-right font-normal">Complexity</th>
                  <th className="px-3 py-2 text-right font-normal">Avg risk</th>
                  <th className="px-5 py-2 text-right font-normal">In / out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.map((s) => (
                  <tr key={s.name}>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2 font-mono text-fg">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-fg-muted">{s.files}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-fg-muted">{s.complexity.toLocaleString("en-US")}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${s.risk >= 50 ? "text-warning" : "text-fg-muted"}`}>{s.risk}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-fg-muted">
                      {s.in} / {s.out}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={`Circular dependencies · ${cycles.length}`}>
          {cycles.length ? (
            <ul className="-mx-5 divide-y divide-line border-t border-line">
              {cycles.map((i) => (
                <IssueRow key={i.id} issue={i} />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13.5px] text-fg-muted">No circular imports found.</p>
          )}
          {violations.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="label text-[10px] text-warning">Layering breaks</p>
              <ul className="mt-2 space-y-1.5">
                {violations.map((v) => (
                  <li key={`${v.from}-${v.to}`} className="font-mono text-[12.5px] text-fg-muted">
                    {groups[v.from]} → {groups[v.to]} <span className="text-fg-dim">· {v.count} imports</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
