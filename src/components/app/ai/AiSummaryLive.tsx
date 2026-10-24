import type { AnalysisResult } from "@/lib/analysisTypes";
import { reviewAnalysis } from "@/server/ai";
import { AiSummary } from "../overview/Widgets";

/** Claude's summary for the Overview. Streams in after the rest of the dashboard. */
export default async function AiSummaryLive({ data, base }: { data: AnalysisResult; base: string }) {
  const review = await reviewAnalysis(data);
  if (!review) return <AiSummary data={data} base={base} status="unavailable" />;

  const byId = new Map(data.issues.map((i) => [i.id, i]));
  const summary = {
    headline: review.headline,
    byClaude: true,
    points: review.points.slice(0, 3).map((p) => ({
      text: p.text,
      evidence: p.issueIds.filter((id) => byId.has(id)).map((id) => `${id} · ${byId.get(id)!.source}`),
    })),
  };
  return <AiSummary data={{ ...data, summary }} base={base} />;
}
