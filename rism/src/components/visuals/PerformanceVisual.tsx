"use client";

/*
 * Two request pipelines side by side. The top one crawls through a slow
 * service → database hop (the bottleneck); the bottom one is PRISM's
 * suggested path, moving at a steady fast pace.
 */

const W = 640;
const H = 300;
const STATIONS = [
  { x: 60, label: "Request" },
  { x: 233, label: "API" },
  { x: 406, label: "Service" },
  { x: 580, label: "Database" },
];
const SLOW_Y = 95;
const FAST_Y = 215;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function PerformanceVisual() {
  const slowPath = `M60 ${SLOW_Y} H580`;
  const fastPath = `M60 ${FAST_Y} H580`;
  // Share of the path before the bottleneck starts.
  const split = ((406 - 60) / 520).toFixed(3);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side_at_78%_32%,rgb(255_77_94/0.2),transparent),radial-gradient(closest-side_at_50%_75%,rgb(94_230_255/0.16),transparent)]"
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Request pipeline slowed by a database bottleneck, and the optimized path">
        {/* Slow pipeline */}
        <line x1="60" y1={SLOW_Y} x2="406" y2={SLOW_Y} stroke="var(--line-strong)" strokeWidth="2" />
        <rect x="406" y={SLOW_Y - 14} width="174" height="28" rx="14" fill="rgb(255 77 94 / 0.12)" />
        <line x1="406" y1={SLOW_Y} x2="580" y2={SLOW_Y} stroke="var(--critical)" strokeWidth="2" className="flow" />

        {/* Fast pipeline */}
        <line x1="60" y1={FAST_Y} x2="580" y2={FAST_Y} stroke="rgb(94 230 255 / 0.5)" strokeWidth="2" />

        {STATIONS.map((s) => (
          <g key={s.x}>
            <circle cx={s.x} cy={SLOW_Y} r="9" fill="var(--bg-2)" stroke="var(--fg-muted)" strokeWidth="1.5" />
            <circle cx={s.x} cy={FAST_Y} r="9" fill="var(--bg-2)" stroke="var(--accent-cyan)" strokeWidth="1.5" />
            <line x1={s.x} y1={SLOW_Y + 14} x2={s.x} y2={FAST_Y - 14} stroke="var(--line)" strokeDasharray="2 5" />
          </g>
        ))}

        {/* Packets: slow ones linger in the bottleneck, fast ones flow evenly. */}
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={`s${i}`} r="4.5" fill="#ffffff">
            <animateMotion
              path={slowPath}
              dur="4.2s"
              begin={`${i * 0.7}s`}
              repeatCount="indefinite"
              calcMode="linear"
              keyPoints={`0;${split};1`}
              keyTimes="0;0.22;1"
            />
          </circle>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={`f${i}`} r="4.5" fill="var(--accent-cyan)">
            <animateMotion path={fastPath} dur="1.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Station labels sit between the two rows. */}
      {STATIONS.map((s) => (
        <span
          key={s.label}
          className="label absolute -translate-x-1/2 -translate-y-1/2 text-[10px] text-fg sm:text-[11px]"
          style={{ left: pct(s.x, W), top: pct((SLOW_Y + FAST_Y) / 2, H) }}
        >
          {s.label}
        </span>
      ))}

      <div className="absolute" style={{ left: pct(406, W), top: 0 }}>
        <p className="label text-[10px] text-critical sm:text-[11px]">Bottleneck detected</p>
      </div>
      <p
        className="absolute -translate-y-full font-mono text-[18px] font-medium text-white sm:text-[26px]"
        style={{ right: 0, top: pct(SLOW_Y - 20, H) }}
      >
        842ms
      </p>

      <div className="absolute" style={{ left: pct(48, W), top: pct(FAST_Y + 22, H) }}>
        <p className="label text-[10px] text-accent-cyan sm:text-[11px]">Optimized path</p>
      </div>
      <p
        className="absolute font-mono text-[18px] font-medium text-accent-cyan sm:text-[26px]"
        style={{ right: 0, top: pct(FAST_Y + 18, H) }}
      >
        127ms
      </p>
    </div>
  );
}
