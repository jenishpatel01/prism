import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/app/Icon";
import { Panel } from "@/components/app/ui";
import { features } from "@/server/config";
import { userAnalyses } from "@/server/db";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Your repositories" };

type GhRepo = {
  id: number;
  name: string;
  owner: { login: string };
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
};

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days < 1 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

async function RepoList() {
  const session = await getSession();
  if (!session) {
    return (
      <Panel>
        <div className="py-8 text-center">
          <p className="text-[16px] text-white">Sign in to see your repositories.</p>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] text-fg-muted">PRISM lists the repositories you&apos;ve pushed to recently so you can analyze them in one click.</p>
          {features().auth ? (

            <a href="/api/auth/login?returnTo=/app/repos" className="mt-6 inline-flex h-10 items-center rounded-md bg-white px-4 text-[13px] font-medium text-bg-0">
              Sign in with GitHub
            </a>
          ) : (
            <Link href="/app/setup" className="mt-6 inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-[13px] text-fg">
              Set up GitHub sign-in
            </Link>
          )}
        </div>
      </Panel>
    );
  }

  const res = await fetch("https://api.github.com/user/repos?sort=pushed&per_page=60&affiliation=owner,collaborator,organization_member", {
    headers: { Authorization: `Bearer ${session.token}`, Accept: "application/vnd.github+json", "User-Agent": "prism-code-intelligence" },
    cache: "no-store",
  });
  if (res.status === 401) {
    return (
      <Panel>
        <p className="text-[15px] text-white">Your GitHub sign-in has expired.</p>
        { }
        <a href="/api/auth/login?returnTo=/app/repos" className="mt-4 inline-flex text-[13px] text-accent">
          Sign in again →
        </a>
      </Panel>
    );
  }
  const repos = res.ok ? ((await res.json()) as GhRepo[]) : [];

  // Latest PRISM score per repo, if the user has analyzed it before.
  const saved = await userAnalyses(session.githubId, 200);
  const latest = new Map<string, number>();
  for (const s of saved) {
    const key = `${s.owner}/${s.repo}`.toLowerCase();
    if (!latest.has(key)) latest.set(key, s.score);
  }

  const canPrivate = session.scopes.includes("repo");

  return (
    <div className="space-y-5">
      {!canPrivate && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg-1/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px] text-fg-muted">
            Showing public repositories. To analyze private ones, PRISM needs read access to your repositories.
          </p>
          { }
          <a href="/api/auth/login?private=1&returnTo=/app/repos" className="inline-flex h-9 shrink-0 items-center rounded-md border border-line-strong px-3.5 text-[13px] text-fg hover:border-fg-muted">
            Allow private repositories
          </a>
        </div>
      )}
      <Panel title={`${repos.length} repositories`}>
        {repos.length ? (
          <ul className="-mx-5 divide-y divide-line border-t border-line">
            {repos.map((r) => {
              const score = latest.get(`${r.owner.login}/${r.name}`.toLowerCase());
              return (
                <li key={r.id}>
                  <Link href={`/app/r/${r.owner.login}/${r.name}`} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.025]">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-[14px] text-fg">
                        <Icon name="repository" size={14} className="shrink-0 text-fg-dim" />
                        <span className="truncate">
                          <span className="text-fg-muted">{r.owner.login}/</span>
                          {r.name}
                        </span>
                        {r.private && <span className="shrink-0 rounded bg-warning/10 px-1.5 font-mono text-[10px] text-warning">private</span>}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-fg-dim">
                        {[r.language, `pushed ${ago(r.pushed_at)}`, r.stargazers_count ? `★ ${r.stargazers_count}` : null].filter(Boolean).join(" · ")}
                        {r.description ? ` — ${r.description}` : ""}
                      </p>
                    </div>
                    <span className="flex items-center gap-3">
                      {score !== undefined && <span className="font-mono text-[14px] text-white">{score}</span>}
                      <span className="inline-flex h-8 items-center rounded-md border border-line px-3 font-mono text-[11px] tracking-[0.1em] text-fg-muted">
                        {score !== undefined ? "OPEN" : "ANALYZE"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-8 text-center text-[14px] text-fg-muted">No repositories found on this account.</p>
        )}
      </Panel>
    </div>
  );
}

export default function ReposPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label text-accent">Your repositories</p>
        <h1 className="mt-3 text-[30px] font-medium tracking-[-0.03em] text-white md:text-[36px]">Pick a repository</h1>
        <p className="mt-2 text-[14px] text-fg-muted">
          Recently pushed first. Or{" "}
          <Link href="/app/new" className="text-accent hover:text-white">
            paste any public repository
          </Link>
          .
        </p>
      </div>
      <Suspense fallback={<Panel><p className="py-6 text-center text-[13px] text-fg-dim">Loading your repositories…</p></Panel>}>
        <RepoList />
      </Suspense>
    </div>
  );
}
