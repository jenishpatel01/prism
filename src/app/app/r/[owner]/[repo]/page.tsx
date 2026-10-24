import { Suspense } from "react";
import AiSummaryLive from "@/components/app/ai/AiSummaryLive";
import Analyzing from "@/components/app/Analyzing";
import OverviewView from "@/components/app/overview/OverviewView";
import { AiSummary } from "@/components/app/overview/Widgets";
import RepoError from "@/components/app/RepoError";
import { features } from "@/server/config";
import { loadRepo } from "@/server/loadRepo";

// Analysis downloads and parses a whole repository, so allow more time than a normal page.
export const maxDuration = 120;

async function RepoOverview({ owner, repo }: { owner: string; repo: string }) {
  const load = await loadRepo(owner, repo);
  if (!load.ok) return <RepoError owner={owner} repo={repo} message={load.error} signInForPrivate={load.signInForPrivate} grantPrivate={load.grantPrivate} />;

  const base = `/app/r/${owner}/${repo}`;
  const ai = features().ai;
  return (
    <OverviewView
      data={load.result}
      base={base}
      aiEnabled={ai}
      aiSlot={
        ai ? (
          // The dashboard shows immediately; Claude's summary streams in when ready.
          <Suspense fallback={<AiSummary data={load.result} base={base} status="pending" />}>
            <AiSummaryLive data={load.result} base={base} />
          </Suspense>
        ) : undefined
      }
    />
  );
}

export default function RepoPage({ params }: PageProps<"/app/r/[owner]/[repo]">) {
  return (
    <Suspense fallback={<Analyzing />}>
      {params.then(({ owner, repo }) => (
        <RepoOverview owner={decodeURIComponent(owner)} repo={decodeURIComponent(repo)} />
      ))}
    </Suspense>
  );
}
