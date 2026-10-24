import type { AnalysisResult, Issue } from "@/lib/analysisTypes";
import { Panel, PanelLink, SeverityBadge, Sparkline } from "../ui";

type Props = { data: AnalysisResult; base: string };

export function StatStrip({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
      {data.stats.map((s) => (
        <div key={s.label} className="bg-bg-1/90 px-5 py-4 backdrop-blur-md">
          <p className="label">{s.label}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-mono text-[24px] text-white">{s.value}</span>
            {s.delta && (
              <span className={`font-mono text-[12px] ${s.good === true ? "text-success" : s.good === false ? "text-critical" : "text-fg-dim"}`}>
                {s.delta}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

export function HealthScore({ data }: Props) {
  const { health, repo } = data;
  const delta = health.previous !== undefined ? health.score - health.previous : null;
  const r = 54;
  const ringColor = health.score >= 75 ? "url(#health-grad)" : health.score >= 55 ? "var(--warning)" : "var(--critical)";
  return (
    <Panel
      title="Health score"
      action={delta !== null ? <span className="font-mono text-[12px] text-success">+{delta} this week</span> : <span className="font-mono text-[12px] text-fg-dim">First analysis</span>}
    >
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
              stroke={ringColor}
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
          {health.history ? (
            <>
              <Sparkline values={health.history} width={150} height={44} className="mt-3 w-full" />
              <p className="mt-1 font-mono text-[11px] text-fg-dim">Last 8 weeks</p>
            </>
          ) : (
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-dim">Trends appear once this repository has been analyzed more than once.</p>
          )}
        </div>
      </div>
      <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-line">
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

export function IssueRow({ issue: i }: { issue: Issue }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-white/[0.025] md:grid-cols-[78px_minmax(0,1fr)_200px_96px]">
      <span className="order-1 md:order-none">
        <SeverityBadge severity={i.severity} />
      </span>
      <div className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1">
        <p className="truncate text-[14px] text-fg" title={i.title}>
          {i.title}
        </p>
        <p className="mt-0.5 truncate font-mono text-[12px] text-fg-dim" title={i.location}>
          {i.location}
        </p>
      </div>
      <div className="order-4 col-span-2 min-w-0 text-[12.5px] md:order-none md:col-span-1">
        <p className="truncate text-fg-muted" title={i.impact}>
          {i.impact}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-fg-dim">{i.source}</p>
      </div>
      <div className="order-2 flex items-center justify-end gap-2.5 md:order-none">
        <span className="h-1 w-10 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full"
            style={{ width: `${i.risk}%`, background: i.risk >= 85 ? "var(--critical)" : i.risk >= 60 ? "var(--warning)" : "var(--fg-muted)" }}
          />
        </span>
        <span className="w-6 text-right font-mono text-[12px] text-fg">{i.risk}</span>
      </div>
    </li>
  );
}

export function TopRisks({ data, base }: Props) {
  const top = data.issues.slice(0, 7);
  return (
    <Panel title="Top risks" action={<PanelLink href={`${base}/security`}>All {data.issues.length} issues</PanelLink>}>
      {top.length ? (
        <ul className="-mx-5 divide-y divide-line border-t border-line">
          {top.map((i) => (
            <IssueRow key={i.id} issue={i} />
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-[14px] text-fg-muted">No issues found. Clean work.</p>
      )}
    </Panel>
  );
}

export function AiSummary({ data, base, status }: Props & { status?: "pending" | "unavailable" }) {
  const { summary } = data;
  return (
    <section className="relative h-full overflow-hidden rounded-xl border border-accent-violet/30 bg-bg-1/85 backdrop-blur-md">
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
          <PanelLink href={`${base}/ai-review`}>Review</PanelLink>
        </div>
        <p className="mt-4 text-[18px] font-medium leading-snug tracking-[-0.015em] text-white">{summary.headline}</p>
        <ol className="mt-5 space-y-5">
          {summary.points.map((p, i) => (
            <li key={i} className="grid grid-cols-[22px_1fr] gap-2">
              <span className="font-mono text-[12px] text-accent-violet">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="break-words text-[13.5px] leading-relaxed text-fg-muted">{p.text}</p>
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
        <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-fg-dim">
          {status === "pending" && <span className="breathe size-1.5 shrink-0 rounded-full bg-accent-violet" />}
          {status === "pending"
            ? "AI is reviewing the findings…"
            : status === "unavailable"
              ? "Built from the analysis facts. The AI review couldn't be generated this time."
              : summary.byClaude
                ? "Written by AI from the analysis facts. Every point links to its evidence."
                : "Built directly from the analysis facts. Add a free Gemini or Claude key in Setup for AI explanations."}
        </p>
      </div>
    </section>
  );
}

export function IssueBreakdown({ data }: Props) {
  const total = data.categories.reduce((n, c) => n + c.count, 0);
  return (
    <Panel title="Issues" action={<span className="font-mono text-[12px] text-fg-muted">{total} open</span>}>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-line">
        {total > 0 &&
          data.categories.map((c) => (
            <span key={c.key} style={{ width: `${(c.count / total) * 100}%`, background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
          ))}
      </div>
      <ul className="mt-5 space-y-3">
        {data.categories.map((c) => (
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
        {data.severityCounts.map((s) => (
          <div key={s.key}>
            <p className={`font-mono text-[20px] ${s.key === "critical" ? "text-critical" : s.key === "high" ? "text-warning" : "text-fg"}`}>{s.count}</p>
            <p className="label mt-0.5 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function Hotspots({ data, base }: Props) {
  const showChurn = data.hotspots.some((h) => h.churn !== undefined);
  return (
    <Panel title="Hotspots" action={<PanelLink href={`${base}/architecture`}>Map</PanelLink>}>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_72px_44px] gap-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-dim">
        <span>Module</span>
        <span>Risk</span>
        <span className="text-right">{showChurn ? "Churn" : "Used by"}</span>
      </div>
      <ul className="space-y-3">
        {data.hotspots.map((h) => (
          <li key={h.module} className="grid grid-cols-[minmax(0,1fr)_72px_44px] items-center gap-3">
            <span className="truncate font-mono text-[12.5px] text-fg" title={h.module}>
              {h.module}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(4, h.risk)}%`,
                  background: "linear-gradient(90deg, #5b8cff, #9d8dff 55%, #ff4d5e)",
                  backgroundSize: `${(100 / Math.max(4, h.risk)) * 100}% 100%`,
                }}
              />
            </span>
            <span className="text-right font-mono text-[12px] text-fg-muted">{showChurn ? `${h.churn}×` : h.fanIn ?? 0}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] leading-relaxed text-fg-dim">
        {showChurn ? "Risk combines complexity, open issues and how often a module changes." : "Risk combines complexity, open issues and how many files depend on a module."}
      </p>
    </Panel>
  );
}

export function QualityMetrics({ data, base }: Props) {
  return (
    <Panel title="Quality" action={<PanelLink href={`${base}/quality`}>Details</PanelLink>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {data.quality.map((q) => (
          <div key={q.label} title={q.note}>
            <p className="label text-[10px]">{q.label}</p>
            <p className="mt-1 font-mono text-[22px] text-white">
              {q.value}
              <span className="text-[12px] text-fg-dim">{q.unit}</span>
            </p>
            {q.trend ? (
              <Sparkline values={q.trend} width={110} height={26} color={q.good ? "var(--accent-cyan)" : "var(--warning)"} className="mt-1 w-full" />
            ) : (
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.min(100, q.unit === "/100" || q.unit === "%" ? Number(q.value) : Number(q.value) * 8)}%`,
                    background: q.good ? "var(--accent-cyan)" : "var(--warning)",
                  }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function PipelineStatus({ data }: Props) {
  const n = data.pipeline.length;
  const half = Math.ceil(n / 2);
  return (
    <Panel title="Last analysis" action={<span className="font-mono text-[12px] text-fg-muted">{data.repo.duration}</span>}>
      <ol
        className="grid gap-y-6 [grid-template-columns:repeat(var(--cols-sm),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
        style={{ "--cols": n, "--cols-sm": half } as React.CSSProperties}
      >
        {data.pipeline.map((p, i) => (
          <li key={p.stage} className="relative">
            {i < n - 1 && (
              <span
                className={`absolute left-3 right-0 top-[11px] h-px ${p.ai ? "bg-accent-violet/50" : "bg-accent/40"} ${(i + 1) % half === 0 ? "max-md:hidden" : ""}`}
              />
            )}
            <span
              className={`relative grid size-[22px] place-items-center rounded-full border ${
                p.skipped
                  ? "border-dashed border-fg-dim bg-bg-1"
                  : p.ai
                    ? "border-accent-violet bg-accent-violet/20 shadow-[0_0_12px_rgb(141_124_255/0.6)]"
                    : "border-accent/70 bg-bg-1"
              }`}
            >
              {!p.skipped && (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="m2 5.2 2 2L8 3" fill="none" stroke={p.ai ? "#cfc7ff" : "#9fbbff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <p className={`mt-2.5 text-[12px] ${p.skipped ? "text-fg-dim" : p.ai ? "text-accent-violet" : "text-fg"}`}>{p.stage}</p>
            <p className="font-mono text-[11px] text-fg-dim">{p.time}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[12.5px] leading-relaxed text-fg-muted">
        Deterministic stages find the facts. AI only runs at the end, to explain them.
      </p>
    </Panel>
  );
}

export function RecentAnalyses({ data, base }: Props) {
  const { history } = data;
  return (
    <Panel title="History" action={history.length ? <PanelLink href={`${base}/history`}>All</PanelLink> : undefined}>
      {history.length ? (
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
      ) : (
        <div className="py-4">
          <p className="text-[13.5px] text-fg">This is the first analysis.</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
            Signed-in users get every analysis saved, with the score change between commits shown here.
          </p>
        </div>
      )}
    </Panel>
  );
}

export function AnalysisNotes({ data }: { data: AnalysisResult }) {
  if (!data.notes.length) return null;
  return (
    <div className="rounded-xl border border-line bg-bg-1/60 px-5 py-4">
      <p className="label">About this analysis</p>
      <ul className="mt-2.5 space-y-1.5">
        {data.notes.map((n) => (
          <li key={n} className="flex gap-2.5 text-[12.5px] leading-relaxed text-fg-muted">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-fg-dim" />
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}
