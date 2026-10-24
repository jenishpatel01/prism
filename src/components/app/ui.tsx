import type { ReactNode } from "react";
import Link from "next/link";
import type { AnalysisResult, Severity } from "@/lib/analysisTypes";
import Icon from "./Icon";
import TimeAgo from "./TimeAgo";

/** A quiet bordered surface. `bare` drops the fill so the 3D canvas shows through. */
export function Panel({
  title,
  action,
  children,
  className = "",
  bare = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <section className={`relative rounded-xl border border-line ${bare ? "" : "bg-bg-1/85 backdrop-blur-md"} ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-4 px-5 pb-1 pt-4">
          <h2 className="label text-fg">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5 pt-3">{children}</div>
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] text-fg-muted transition-colors hover:text-white">
      {children}
      <Icon name="arrow" size={14} />
    </Link>
  );
}

const severityStyle: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical ring-critical/30",
  high: "bg-warning/12 text-warning ring-warning/25",
  medium: "bg-white/[0.06] text-fg-muted ring-white/10",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex h-5 items-center rounded px-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ring-1 ring-inset ${severityStyle[severity]}`}>
      {severity}
    </span>
  );
}

/** Tiny line chart. Values are scaled to fit the box. */
export function Sparkline({
  values,
  color = "var(--accent)",
  width = 120,
  height = 36,
  className = "",
}: {
  values: readonly number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `spark-${values.join("-").replace(/\./g, "_")}`;
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${line} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.6" fill={color} />
    </svg>
  );
}

/** Title row with repository context and actions, shared by all app screens. */
export function PageHeader({
  title,
  description,
  repo,
}: {
  title: string;
  description?: string;
  repo: AnalysisResult["repo"] & { demo?: boolean };
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-fg-dim">
          <span>
            {repo.owner} / {repo.name} / <span className="text-fg-muted">{title}</span>
          </span>
          {repo.demo && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10.5px] uppercase tracking-[0.1em] text-accent">Demo data</span>}
        </p>
        <h1 className="mt-2 text-[30px] font-medium tracking-[-0.03em] text-white md:text-[36px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-fg-muted">{description}</p>
        ) : (
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="branch" size={13} />
              {repo.branch} · {repo.commit}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
              Analyzed {repo.demo ? "4 min ago" : <TimeAgo iso={repo.analyzedAt} />}
            </span>
            <span>Took {repo.duration}</span>
            {repo.stars !== undefined && <span>★ {repo.stars.toLocaleString("en-US")}</span>}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {repo.demo ? (
          <Link
            href="/app/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-[13px] font-medium text-bg-0 shadow-[0_0_24px_rgb(91_140_255/0.35)] transition-shadow hover:shadow-[0_0_32px_rgb(91_140_255/0.6)]"
          >
            <Icon name="search" size={15} />
            Analyze a repository
          </Link>
        ) : (
          <>
            <a
              href={`https://github.com/${repo.owner}/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-bg-1/70 px-3.5 text-[13px] text-fg transition-colors hover:border-fg-muted"
            >
              <Icon name="export" size={15} />
              GitHub
            </a>
            <Link
              href="/app/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-[13px] font-medium text-bg-0 shadow-[0_0_24px_rgb(91_140_255/0.35)] transition-shadow hover:shadow-[0_0_32px_rgb(91_140_255/0.6)]"
            >
              <Icon name="search" size={15} />
              Analyze another
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
