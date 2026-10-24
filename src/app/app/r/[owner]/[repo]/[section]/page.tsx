import { Suspense } from "react";
import { notFound } from "next/navigation";
import AiReviewView from "@/components/app/ai/AiReviewView";
import Analyzing from "@/components/app/Analyzing";
import HistoryView from "@/components/app/HistoryView";
import RepoError from "@/components/app/RepoError";
import SectionView from "@/components/app/SectionView";
import { SECTIONS } from "@/components/app/sections";
import { PageHeader } from "@/components/app/ui";
import { loadRepo } from "@/server/loadRepo";

export const maxDuration = 120;

async function RepoSection({ owner, repo, section }: { owner: string; repo: string; section: string }) {
  if (!SECTIONS[section]) notFound();
  // Same cache entry as the overview, so this is instant after the first analysis.
  const load = await loadRepo(owner, repo);
  if (!load.ok) return <RepoError owner={owner} repo={repo} message={load.error} signInForPrivate={load.signInForPrivate} grantPrivate={load.grantPrivate} />;

  const base = `/app/r/${owner}/${repo}`;
  const data = load.result;

  if (section === "ai-review") return <AiReviewView data={data} base={base} />;
  if (section === "history") {
    return (
      <div className="space-y-6">
        <PageHeader title="History" description="Every analysis of this repository you've run, newest first." repo={{ ...data.repo, demo: false }} />
        <HistoryView owner={data.repo.owner} repo={data.repo.name} />
      </div>
    );
  }
  return <SectionView section={section} data={data} base={base} />;
}

export default function RepoSectionPage({ params }: PageProps<"/app/r/[owner]/[repo]/[section]">) {
  return (
    <Suspense fallback={<Analyzing />}>
      {params.then(({ owner, repo, section }) => (
        <RepoSection owner={decodeURIComponent(owner)} repo={decodeURIComponent(repo)} section={section} />
      ))}
    </Suspense>
  );
}
