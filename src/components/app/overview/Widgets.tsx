import {
  categories,
  health,
  history,
  hotspots,
  issues,
  pipeline,
  quality,
  repo,
  severityCounts,
  stats,
  summary,
} from "@/lib/demoAnalysis";
import { Panel, PanelLink, SeverityBadge, Sparkline } from "../ui";

export function StatStrip() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-bg-1/90 px-5 py-4 backdrop-blur-md">
          <p className="label">{s.label}</p>
          <p className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-[24px] text-white">{s.value}</span>
            <span className={`font-mono text-[12px] ${s.good ? "text-success" : "text-fg-dim"}`}>{s.delta}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function HealthScore() {
  const delta = health.score - health.previous;
  const r = 54;
  return (
    <Panel title="Health score" action={<span className="font-mono text-[12px] text-success">+{delta} this week</span>}>
      <div className="flex items-center gap-6">
        <div className="relative size-[132px] shrink-0">
          <svg viewBox="0 0 132 132" className="size-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="health-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#6fe3ff" />
                <stop offset="0.5" stopColor="#5b8cff" />
                <stop offset="1" stopColor="#9d8dff" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
            <circle
              cx="66"
              cy="66"
              r={r}
              fill="none"
              stroke="url(#health-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${health.score} 100`}
              style={{ filter: "drop-shadow(0 0 6px rgb(91 140 255 / 0.6))" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[38px] font-medium leading-none tracking-[-0.03em] text-white">{health.score}</p>
              <p className="label mt-1 text-[10px]">of 100</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-fg-muted">
            Grade <span className="font-medium text-white">{health.grade}</span>
          </p>
          <Sparkline values={health.history} width={150} height={44} className="mt-3 w-full" />
          <p className="mt-1 font-mono text-[11px] text-fg-dim">Last 8 weeks</p>
        </div>
      </div>
      <div className="mt-5 flex h-1.5 overflow-hidden rounded-full">
        {repo.languages.map((l) => (
          <span key={l.name} style={{ width: `${l.pct}%`, background: l.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {repo.languages.map((l) => (
          <li key={l.name} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span className="size-1.5 rounded-full" style={{ background: l.color }} />
            {l.name} <span className="font-mono text-fg-dim">{l.pct}%</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function TopRisks() {
  return (
    <Panel title="Top risks" action={<PanelLink href="/app/security">All 23 issues</PanelLink>}>
      <ul className="-mx-5 divide-y divide-line border-t border-line">
        {issues.map((i) => (
          <li
            key={i.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-white/[0.025] md:grid-cols-[78px_minmax(0,1fr)_160px_96px]"
          >
            <span className="order-1 md:order-none">
              <SeverityBadge severity={i.severity} />
            </span>
            <div className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1">
              <p className="truncate text-[14px] text-fg">{i.title}</p>
              <p className="mt-0.5 truncate font-mono text-[12px] text-fg-dim">{i.location}</p>
            </div>
            <div className="order-4 col-span-2 text-[12.5px] md:order-none md:col-span-1">
              <p className="text-fg-muted">{i.impact}</p>
              <p className="mt-0.5 font-mono text-[11px] text-fg-dim">{i.source}</p>
            </div>
            <div className="order-2 flex items-center justify-end gap-2.5 md:order-none">
              <span className="h-1 w-10 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${i.risk}%`,
                    background: i.risk >= 85 ? "var(--critical)" : i.risk >= 65 ? "var(--warning)" : "var(--fg-muted)",
                  }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[12px] text-fg">{i.risk}</span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AiSummary() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-accent-violet/30 bg-bg-1/85 backdrop-blur-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(141_124_255/0.35),transparent)]"
      />
      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <p className="label flex items-center gap-2 text-fg">
            <span className="breathe size-2 rounded-full bg-accent-violet shadow-[0_0_10px_var(--accent-violet)]" />
            PRISM core summary
          </p>
          <PanelLink href="/app/ai-review">Review</PanelLink>
        </div>
        <p className="mt-4 text-[18px] font-medium leading-snug tracking-[-0.015em] text-white">{summary.headline}</p>
        <ol className="mt-5 space-y-5">
          {summary.points.map((p, i) => (
            <li key={i} className="grid grid-cols-[22px_1fr] gap-2">
              <span className="font-mono text-[12px] text-accent-violet">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-[13.5px] leading-relaxed text-fg-muted">{p.text}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {p.evidence.map((e) => (
                    <span key={e} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-fg-dim">
                      {e}
                    </span>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-fg-dim">
          Written by Claude from 8 deterministic analyses. Every claim links to its evidence.
        </p>
      </div>
    </section>
  );
}

export function IssueBreakdown() {
  const total = categories.reduce((n, c) => n + c.count, 0);
  return (
    <Panel title="Issues" action={<span className="font-mono text-[12px] text-fg-muted">{total} open</span>}>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {categories.map((c) => (
          <span key={c.key} style={{ width: `${(c.count / total) * 100}%`, background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
        ))}
      </div>
      <ul className="mt-5 space-y-3">
        {categories.map((c) => (
          <li key={c.key} className="flex items-center justify-between text-[13.5px]">
            <span className="flex items-center gap-2.5 text-fg">
              <span className="size-2 rounded-sm" style={{ background: c.color }} />
              {c.label}
            </span>
            <span className="font-mono text-fg">{c.count}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
        {severityCounts.map((s) => (
          <div key={s.key}>
            <p
              className={`font-mono text-[20px] ${s.key === "critical" ? "text-critical" : s.key === "high" ? "text-warning" : "text-fg"}`}
            >
              {s.count}
            </p>
            <p className="label mt-0.5 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function Hotspots() {
  return (
    <Panel title="Hotspots" action={<PanelLink href="/app/architecture">Map</PanelLink>}>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_72px_44px] gap-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-dim">
        <span>Module</span>
        <span>Risk</span>
        <span className="text-right">Churn</span>
      </div>
      <ul className="space-y-3">
        {hotspots.map((h) => (
          <li key={h.module} className="grid grid-cols-[minmax(0,1fr)_72px_44px] items-center gap-3">
            <span className="truncate font-mono text-[12.5px] text-fg">{h.module}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${h.risk}%`,
                  background: "linear-gradient(90deg, #5b8cff, #9d8dff 55%, #ff4d5e)",
                  backgroundSize: `${(100 / h.risk) * 100}% 100%`,
                }}
              />
            </span>
            <span className="text-right font-mono text-[12px] text-fg-muted">{h.churn}×</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] leading-relaxed text-fg-dim">Risk combines complexity, open issues and how often a module changes.</p>
    </Panel>
  );
}

export function QualityMetrics() {
  return (
    <Panel title="Quality" action={<PanelLink href="/app/quality">Details</PanelLink>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {quality.map((q) => (
          <div key={q.label}>
            <p className="label text-[10px]">{q.label}</p>
            <p className="mt-1 font-mono text-[22px] text-white">
              {q.value}
              <span className="text-[12px] text-fg-dim">{q.unit}</span>
            </p>
            <Sparkline
              values={q.trend}
              width={110}
              height={26}
              color={q.good ? "var(--accent-cyan)" : "var(--warning)"}
              className="mt-1 w-full"
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function PipelineStatus() {
  return (
    <Panel title="Last analysis" action={<span className="font-mono text-[12px] text-fg-muted">{repo.duration}</span>}>
      <ol className="grid grid-cols-5 gap-y-6 md:grid-cols-10">
        {pipeline.map((p, i) => (
          <li key={p.stage} className="relative">
            {i < pipeline.length - 1 && (
              <span
                className={`absolute left-3 right-0 top-[11px] h-px ${p.ai ? "bg-accent-violet/50" : "bg-accent/40"} ${(i + 1) % 5 === 0 ? "max-md:hidden" : ""}`}
              />
            )}
            <span
              className={`relative grid size-[22px] place-items-center rounded-full border ${
                p.ai
                  ? "border-accent-violet bg-accent-violet/20 shadow-[0_0_12px_rgb(141_124_255/0.6)]"
                  : "border-accent/70 bg-bg-1"
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="m2 5.2 2 2L8 3" fill="none" stroke={p.ai ? "#cfc7ff" : "#9fbbff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className={`mt-2.5 text-[12px] ${p.ai ? "text-accent-violet" : "text-fg"}`}>{p.stage}</p>
            <p className="font-mono text-[11px] text-fg-dim">{p.time}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[12.5px] leading-relaxed text-fg-muted">
        Eight deterministic stages find the facts. Claude only runs at the end, to explain them.
      </p>
    </Panel>
  );
}

export function RecentAnalyses() {
  return (
    <Panel title="History" action={<PanelLink href="/app/history">All</PanelLink>}>
      <ul className="-mx-5 divide-y divide-line border-t border-line">
        {history.map((h, i) => {
          const prev = history[i + 1];
          const delta = prev ? h.score - prev.score : 0;
          return (
            <li key={h.commit} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] text-fg">{h.message}</p>
                <p className="mt-0.5 font-mono text-[11.5px] text-fg-dim">
                  {h.commit} · {h.when}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[15px] text-white">{h.score}</p>
                {prev && (
                  <p className={`font-mono text-[11px] ${delta >= 0 ? "text-success" : "text-critical"}`}>
                    {delta >= 0 ? "+" : ""}
                    {delta}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
