import Link from "next/link";
import type { AnalysisResult } from "@/lib/analysisTypes";
import { reviewAnalysis, type AiReview } from "@/server/ai";
import { PageHeader, Panel, PanelLink, SeverityBadge } from "../ui";

const PRIORITY: Record<string, string> = { now: "Fix now", soon: "Fix soon", later: "Plan for later" };

/** Full AI Review: Claude's explanation and suggested fix for each top finding. */
export default async function AiReviewView({ data, base, review: given }: { data: AnalysisResult; base: string; review?: AiReview }) {
  const repo = { ...data.repo, demo: data.demo };
  const review = given ?? (await reviewAnalysis(data));

  if (!review) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Review" description="AI explains each finding and how to fix it." repo={repo} />
        <Panel>
          <p className="text-[15px] text-white">The AI review isn&apos;t available right now.</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
            Either no AI key is configured, or the request failed. Check the status on the{" "}
            <Link href="/app/setup" className="text-accent hover:text-white">
              Setup page
            </Link>
            .
          </p>
        </Panel>
      </div>
    );
  }

  const byId = new Map(data.issues.map((i) => [i.id, i]));
  const items = review.reviews.filter((r) => byId.has(r.issueId));

  return (
    <div className="space-y-6">
      <PageHeader title="AI Review" description="AI explains each finding and how to fix it, using only PRISM's analysis facts." repo={repo} />

      <section className="relative overflow-hidden rounded-xl border border-accent-violet/30 bg-bg-1/85 p-6 backdrop-blur-md">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(141_124_255/0.3),transparent)]" />
        <p className="label relative flex items-center gap-2 text-fg">
          <span className="size-2 rounded-full bg-accent-violet shadow-[0_0_10px_var(--accent-violet)]" />
          PRISM core · {review.model}
        </p>
        <p className="relative mt-4 text-[22px] font-medium leading-snug tracking-[-0.02em] text-white">{review.headline}</p>
        <p className="relative mt-3 max-w-3xl text-[14.5px] leading-relaxed text-fg-muted">{review.overview}</p>
      </section>

      <Panel title={`${items.length} findings reviewed`} action={<PanelLink href={base}>Overview</PanelLink>}>
        <ol className="-mx-5 divide-y divide-line border-t border-line">
          {items.map((r) => {
            const issue = byId.get(r.issueId)!;
            return (
              <li key={r.issueId} className="grid gap-4 px-5 py-5 md:grid-cols-[220px_1fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <span className={`font-mono text-[11px] ${r.priority === "now" ? "text-critical" : r.priority === "soon" ? "text-warning" : "text-fg-dim"}`}>
                      {PRIORITY[r.priority]}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[14px] text-fg">{issue.title}</p>
                  <p className="mt-1 break-all font-mono text-[11.5px] text-fg-dim">{issue.location}</p>
                  <p className="mt-1 font-mono text-[11px] text-fg-dim">
                    {issue.id} · {issue.source}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="label text-[10px]">Why it matters</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{r.explanation}</p>
                  </div>
                  <div>
                    <p className="label text-[10px] text-accent-cyan">Suggested fix</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-fg">{r.fix}</p>
                  </div>
                  {r.falsePositiveRisk !== "low" && (
                    <p className="text-[12px] text-fg-dim">
                      The AI thinks this may be a false positive ({r.falsePositiveRisk} likelihood). Check the code before changing it.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>
      <p className="text-[12px] leading-relaxed text-fg-dim">
        The AI only sees the findings, file locations and metrics above, never your source code. Explanations can be wrong; the linked facts are the source of truth.
      </p>
    </div>
  );
}
