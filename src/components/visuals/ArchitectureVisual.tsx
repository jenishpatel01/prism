"use client";

/*
 * Layered architecture map. Each row is a layer, each circle a module sized
 * by importance; dependencies flow downward. One high-risk module is ringed.
 */

const W = 640;
const H = 430;

type Mod = { x: number; r: number; name?: string; risk?: boolean };
const LAYERS: { name: string; y: number; mods: Mod[] }[] = [
  { name: "Frontend", y: 45, mods: [{ x: 230, r: 9 }, { x: 350, r: 15, name: "app" }, { x: 480, r: 8 }] },
  {
    name: "Components",
    y: 130,
    mods: [{ x: 170, r: 6 }, { x: 245, r: 11 }, { x: 320, r: 7 }, { x: 395, r: 13, name: "ui" }, { x: 470, r: 6 }, { x: 545, r: 8 }],
  },
  { name: "Services", y: 220, mods: [{ x: 220, r: 17, name: "orders", risk: true }, { x: 360, r: 11 }, { x: 490, r: 14, name: "billing" }] },
  { name: "API", y: 305, mods: [{ x: 280, r: 13, name: "rest" }, { x: 430, r: 10, name: "graphql" }] },
  { name: "Database", y: 385, mods: [{ x: 355, r: 19, name: "postgres" }] },
];

// Connect each module to its two nearest modules in the next layer down.
const links: { x1: number; y1: number; x2: number; y2: number; hot: boolean }[] = [];
LAYERS.forEach((layer, li) => {
  const next = LAYERS[li + 1];
  if (!next) return;
  layer.mods.forEach((m) => {
    const sorted = [...next.mods].sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x));
    sorted.slice(0, 2).forEach((n) => {
      links.push({ x1: m.x, y1: layer.y, x2: n.x, y2: next.y, hot: !!(m.risk || n.risk) });
    });
  });
});

export default function ArchitectureVisual() {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side_at_55%_50%,rgb(141_124_255/0.2),transparent)]"
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Software architecture as layered modules with dependencies">
        {LAYERS.map((l) => (
          <line key={l.name} x1="130" y1={l.y} x2="620" y2={l.y} stroke="var(--line)" strokeDasharray="2 6" />
        ))}
        {links.map((k, i) => {
          const my = (k.y1 + k.y2) / 2;
          const d = `M${k.x1} ${k.y1} C${k.x1} ${my} ${k.x2} ${my} ${k.x2} ${k.y2}`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={k.hot ? "rgb(255 77 94 / 0.45)" : "rgb(157 141 255 / 0.35)"} strokeWidth="1.2" />
              <path
                d={d}
                fill="none"
                stroke={k.hot ? "var(--critical)" : "#c9c1ff"}
                strokeWidth="1.6"
                className="flow"
                style={{ animationDelay: `${(i % 5) * -0.3}s` }}
              />
            </g>
          );
        })}
        {LAYERS.map((l) =>
          l.mods.map((m) => (
            <g key={l.name + m.x}>
              {m.risk && <circle cx={m.x} cy={l.y} r={m.r} fill="none" stroke="var(--critical)" strokeWidth="1.5" className="pulse-ring" />}
              <circle
                cx={m.x}
                cy={l.y}
                r={m.r}
                fill={m.risk ? "rgb(255 77 94 / 0.25)" : "rgb(141 124 255 / 0.18)"}
                stroke={m.risk ? "var(--critical)" : "#b4a9ff"}
                strokeWidth="1.4"
              />
              <circle cx={m.x} cy={l.y} r={Math.max(2, m.r * 0.28)} fill="#ffffff" />
              {m.name && (
                <text x={m.x + m.r + 7} y={l.y + 4} className="font-mono" fontSize="12" fill={m.risk ? "#ff8f99" : "var(--fg-muted)"}>
                  {m.name}
                </text>
              )}
            </g>
          )),
        )}
      </svg>

      {LAYERS.map((l) => (
        <span
          key={l.name}
          className="label absolute left-0 -translate-y-1/2 text-[9px] sm:text-[11px]"
          style={{ top: `${(l.y / H) * 100}%` }}
        >
          {l.name}
        </span>
      ))}
    </div>
  );
}
