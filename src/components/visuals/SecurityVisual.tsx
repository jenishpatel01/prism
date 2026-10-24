"use client";

import { useInView } from "@/lib/useInView";

type N = { id: string; x: number; y: number; r: number; label?: string; hop?: number };

// hop = how many steps the vulnerability travels to reach this file.
const nodes: N[] = [
  { id: "src", x: 300, y: 225, r: 12, label: "users.ts", hop: 0 },
  { id: "a", x: 165, y: 150, r: 8, label: "auth.ts", hop: 1 },
  { id: "b", x: 435, y: 135, r: 8, label: "session.ts", hop: 1 },
  { id: "c", x: 470, y: 300, r: 9, label: "orders.ts", hop: 1 },
  { id: "d", x: 150, y: 315, r: 7, label: "admin.ts", hop: 1 },
  { id: "e", x: 315, y: 365, r: 7, label: "export.ts", hop: 1 },
  { id: "a1", x: 70, y: 85, r: 5, hop: 2 },
  { id: "a2", x: 225, y: 55, r: 5, hop: 2 },
  { id: "b1", x: 545, y: 70, r: 5, hop: 2 },
  { id: "b2", x: 360, y: 45, r: 4, hop: 2 },
  { id: "c1", x: 560, y: 385, r: 5, hop: 2 },
  { id: "d1", x: 45, y: 245, r: 4, hop: 2 },
  { id: "d2", x: 90, y: 400, r: 5, hop: 2 },
  { id: "e1", x: 430, y: 415, r: 4, hop: 2 },
  { id: "u1", x: 565, y: 215, r: 5 },
  { id: "u2", x: 230, y: 420, r: 4 },
  { id: "u3", x: 30, y: 150, r: 3 },
  { id: "u4", x: 300, y: 120, r: 4 },
];

const edges: [string, string][] = [
  ["src", "a"], ["src", "b"], ["src", "c"], ["src", "d"], ["src", "e"],
  ["a", "a1"], ["a", "a2"], ["b", "b1"], ["b", "b2"], ["c", "c1"],
  ["d", "d1"], ["d", "d2"], ["e", "e1"],
  ["u1", "c"], ["u1", "b1"], ["u2", "e"], ["u2", "d2"], ["u3", "a1"], ["u3", "d1"], ["u4", "a2"], ["u4", "b2"],
];

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const STEP = 0.8; // seconds per hop

export default function SecurityVisual() {
  const [ref, active] = useInView<HTMLDivElement>(0.35);

  return (
    <div ref={ref}>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgb(255_77_94/0.22),transparent)] blur-2xl"
        />
        <svg viewBox="0 0 600 440" className="relative w-full" role="img" aria-label="A vulnerability in users.ts spreading to the files that depend on it">
          {edges.map(([from, to]) => {
            const a = byId[from];
            const b = byId[to];
            const affected = a.hop !== undefined && b.hop === a.hop + 1;
            return (
              <g key={from + to}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line-strong)" strokeWidth="1" />
                {affected && (
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    pathLength={1}
                    stroke="var(--critical)"
                    strokeWidth="1.6"
                    strokeDasharray="1"
                    style={{
                      strokeDashoffset: active ? 0 : 1,
                      transition: `stroke-dashoffset ${STEP}s ease-out ${(a.hop ?? 0) * STEP + 0.4}s`,
                    }}
                  />
                )}
              </g>
            );
          })}

          {nodes.map((n) => {
            const hit = n.hop !== undefined;
            const delay = (n.hop ?? 0) * STEP + (n.hop ? 0.4 : 0);
            return (
              <g key={n.id}>
                {n.hop === 0 && active && (
                  <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke="var(--critical)" strokeWidth="1.5" className="pulse-ring" />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  style={{
                    fill: hit && active ? "var(--critical)" : "var(--bg-2)",
                    stroke: hit && active ? "#ff8f99" : "var(--fg-dim)",
                    transition: `fill .5s ease ${delay}s, stroke .5s ease ${delay}s`,
                  }}
                  strokeWidth="1.2"
                />
                {n.label && (
                  <text
                    x={n.x}
                    y={n.y - n.r - 9}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={n.hop === 0 ? 14 : 12}
                    fill={n.hop === 0 ? "#ffffff" : "var(--fg-muted)"}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Readout strip */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-l-2 border-critical pl-5 sm:grid-cols-4">
        <div>
          <dt className="label">Severity</dt>
          <dd className="mt-1.5 font-mono text-[13px] font-medium text-critical">CRITICAL</dd>
        </div>
        <div>
          <dt className="label">Type</dt>
          <dd className="mt-1.5 text-[14px] text-fg">SQL injection</dd>
        </div>
        <div>
          <dt className="label">Location</dt>
          <dd className="mt-1.5 font-mono text-[13px] text-fg">src/api/users.ts:184</dd>
        </div>
        <div>
          <dt className="label">Risk score</dt>
          <dd className="mt-1.5 flex items-center gap-3">
            <span className="font-mono text-[13px] text-fg">94/100</span>
            <span className="h-1 w-14 overflow-hidden rounded-full bg-line-strong">
              <span
                className="block h-full rounded-full bg-critical"
                style={{ width: active ? "94%" : "0%", transition: "width 1.4s var(--ease-out) .3s" }}
              />
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
