import RepoMap from "@/components/app/overview/RepoMap";
import {
  AiSummary,
  HealthScore,
  Hotspots,
  IssueBreakdown,
  PipelineStatus,
  QualityMetrics,
  RecentAnalyses,
  StatStrip,
  TopRisks,
} from "@/components/app/overview/Widgets";
import { PageHeader } from "@/components/app/ui";

export default function OverviewPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Overview" />

      <div className="pt-3">
        <StatStrip />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-4 *:h-full">
          <HealthScore />
        </div>
        <div className="xl:col-span-8 *:h-full">
          <RepoMap />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <TopRisks />
        </div>
        <div className="xl:col-span-4">
          <AiSummary />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 *:h-full">
        <IssueBreakdown />
        <Hotspots />
        <div className="md:col-span-2 xl:col-span-1 *:h-full">
          <QualityMetrics />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8 *:h-full">
          <PipelineStatus />
        </div>
        <div className="xl:col-span-4 *:h-full">
          <RecentAnalyses />
        </div>
      </div>
    </div>
  );
}
