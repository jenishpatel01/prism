import type { AnalysisResult } from "@/lib/analysisTypes";
import { demoReview } from "@/lib/demoAnalysis";
import AiReviewView from "./ai/AiReviewView";
import ArchitectureView from "./architecture/ArchitectureView";
import { IssueRow } from "./overview/Widgets";
import RepositoryExplorer from "./repository/RepositoryExplorer";
import { SECTIONS } from "./sections";
import { PageHeader, Panel, PanelLink } from "./ui";

/** One app section for any analysis, demo or real. (History is handled by the routes, since it needs the session.) */
export default function SectionView({ section, data, base }: { section: string; data: AnalysisResult; base: string }) {
  const s = SECTIONS[section];
  const repo = { ...data.repo, demo: data.demo };

  if (section === "repository") {
    return (
      <div className="space-y-5">
        <PageHeader title="Repository" description={s.description} repo={repo} />
        {data.graph ? (
          <RepositoryExplorer graph={data.graph} issues={data.issues} />
        ) : (
          <Panel>
            <p className="text-[14px] text-fg-muted">No files could be mapped for this repository.</p>
          </Panel>
        )}
      </div>
    );
  }

  if (section === "architecture") return <ArchitectureView data={data} base={base} />;

  if (section === "ai-review") return <AiReviewView data={data} base={base} review={data.demo ? demoReview : undefined} />;

  const list = data.issues.filter((i) => i.category === s.category);
  const by = (sev: string) => list.filter((i) => i.severity === sev).length;

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} description={s.description} repo={repo} />
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:max-w-md">
        {(["critical", "high", "medium"] as const).map((sev) => (
          <div key={sev} className="bg-bg-1/90 px-5 py-4">
            <p className={`font-mono text-[22px] ${sev === "critical" ? "text-critical" : sev === "high" ? "text-warning" : "text-fg"}`}>{by(sev)}</p>
            <p className="label mt-1 text-[10px]">{sev}</p>
          </div>
        ))}
      </div>
      <Panel title={`${list.length} ${list.length === 1 ? "finding" : "findings"}`} action={<PanelLink href={`${base}/ai-review`}>Explain with AI</PanelLink>}>
        {list.length ? (
          <ul className="-mx-5 divide-y divide-line border-t border-line">
            {list.map((i) => (
              <IssueRow key={i.id} issue={i} />
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-[14px] text-fg-muted">Nothing found in this category.</p>
        )}
      </Panel>
      <p className="text-[12px] leading-relaxed text-fg-dim">{s.planned[0]}</p>
    </div>
  );
}
