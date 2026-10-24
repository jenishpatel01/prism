import Link from "next/link";
import { features } from "@/server/config";
import { repoHistory, userAnalyses } from "@/server/db";
import { getSession } from "@/server/session";
import Icon from "./Icon";
import { Panel } from "./ui";

function when(d: Date) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Saved analyses: all of the user's, or one repository's. Reads the session, so render inside Suspense. */
export default async function HistoryView({ owner, repo }: { owner?: string; repo?: string }) {
  const f = features();
  const session = await getSession();

  if (!session) {
    return (
      <Panel>
        <div className="py-6 text-center">
          <p className="text-[16px] text-white">Sign in to keep a history of your analyses.</p>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-fg-muted">
            Every analysis you run is saved with its score, so you can see how a repository changes over time.
          </p>
          {f.auth ? (

            <a href="/api/auth/login?returnTo=/app/history" className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-[13px] font-medium text-bg-0">
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

  if (!f.db) {
    return (
      <Panel>
        <p className="text-[15px] text-white">History needs a database.</p>
        <p className="mt-2 text-[13.5px] text-fg-muted">
          Add <span className="font-mono text-fg">DATABASE_URL</span> on the{" "}
          <Link href="/app/setup" className="text-accent hover:text-white">
            Setup page
          </Link>{" "}
          and new analyses will be saved automatically.
        </p>
      </Panel>
    );
  }

  const rows = owner && repo ? await repoHistory(session.githubId, owner, repo, 50) : await userAnalyses(session.githubId, 100);

  return (
    <Panel title={`${rows.length} saved ${rows.length === 1 ? "analysis" : "analyses"}`}>
      {rows.length ? (
        <ul className="-mx-5 divide-y divide-line border-t border-line">
          {rows.map((r, i) => {
            const older = rows.slice(i + 1).find((x) => x.owner.toLowerCase() === r.owner.toLowerCase() && x.repo.toLowerCase() === r.repo.toLowerCase());
            const delta = older ? r.score - older.score : null;
            return (
              <li key={r.id}>
                <Link href={`/app/r/${r.owner}/${r.repo}`} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.025]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-[14px] text-fg">
                      <Icon name="repository" size={14} className="shrink-0 text-fg-dim" />
                      {r.owner}/{r.repo}
                      {r.is_private && <span className="rounded bg-warning/10 px-1.5 font-mono text-[10px] text-warning">private</span>}
                    </p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-fg-dim">
                      {r.commit_sha} · {when(r.created_at)} · {r.issues} issues{r.critical ? ` · ${r.critical} critical` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[16px] text-white">{r.score}</p>
                    {delta !== null && (
                      <p className={`font-mono text-[11px] ${delta >= 0 ? "text-success" : "text-critical"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-[14px] text-fg-muted">
          No saved analyses yet.{" "}
          <Link href="/app/new" className="text-accent hover:text-white">
            Analyze a repository
          </Link>
        </p>
      )}
    </Panel>
  );
}
