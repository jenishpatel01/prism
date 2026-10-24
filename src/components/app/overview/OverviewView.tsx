import type { ReactNode } from "react";
import type { AnalysisResult } from "@/lib/analysisTypes";
import { PageHeader } from "../ui";
import RepoMap from "./RepoMap";
import {
  AiSummary,
  AnalysisNotes,
  HealthScore,
  Hotspots,
  IssueBreakdown,
  PipelineStatus,
  QualityMetrics,
  RecentAnalyses,
  StatStrip,
  TopRisks,
} from "./Widgets";

/**
 * The Overview screen for any analysis, demo or real. `base` is the URL prefix
 * for section links. `aiSlot` replaces the summary panel (Claude's live review).
 */
export default function OverviewView({
  data,
  base,
  aiSlot,
  aiEnabled = false,
}: {
  data: AnalysisResult;
  base: string;
  aiSlot?: ReactNode;
  aiEnabled?: boolean;
}) {
  const shown = aiEnabled
    ? { ...data, pipeline: data.pipeline.map((s) => (s.stage === "AI" ? { ...s, time: "Explains", skipped: false } : s)) }
    : data;
  const p = { data: shown, base };
  return (
    <div className="space-y-5">
      <PageHeader title="Overview" repo={{ ...data.repo, demo: data.demo }} />
      {data.repo.private && (
        <p className="-mt-2 inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[11px] text-warning">
          Private repository · only visible to you
        </p>
      )}

      <div className="pt-3">
        <StatStrip {...p} />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-4 *:h-full">
          <HealthScore {...p} />
        </div>
        <div className="xl:col-span-8 *:h-full">
          <RepoMap {...p} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8 *:h-full">
          <TopRisks {...p} />
        </div>
        <div className="xl:col-span-4">{aiSlot ?? <AiSummary {...p} />}</div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 *:h-full">
        <IssueBreakdown {...p} />
        <Hotspots {...p} />
        <div className="md:col-span-2 xl:col-span-1 *:h-full">
          <QualityMetrics {...p} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8 *:h-full">
          <PipelineStatus {...p} />
        </div>
        <div className="xl:col-span-4 *:h-full">
          <RecentAnalyses {...p} />
        </div>
      </div>

      <AnalysisNotes data={data} />
    </div>
  );
}
