import Link from "next/link";
import Icon from "./Icon";

/** Friendly failure screen for an analysis that couldn't run, with a sign-in path for private repos. */
export default function RepoError({
  owner,
  repo,
  message,
  signInForPrivate,
  grantPrivate,
}: {
  owner: string;
  repo: string;
  message: string;
  signInForPrivate?: boolean;
  grantPrivate?: boolean;
}) {
  const returnTo = encodeURIComponent(`/app/r/${owner}/${repo}`);
  return (
    <div className="grid min-h-[60svh] place-items-center py-10">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-critical/40 bg-critical/10 text-critical">
          <Icon name="security" size={24} />
        </span>
        <p className="label mt-6">Analysis stopped</p>
        <p className="mt-3 font-mono text-[16px] text-white">
          {owner}/{repo}
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">{message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {(signInForPrivate || grantPrivate) && (
            // Route handler that redirects to GitHub, so a plain link is right here.
            <a
              href={`/api/auth/login?private=1&returnTo=${returnTo}`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-[13px] font-medium text-bg-0"
            >
              <Icon name="repository" size={15} />
              {grantPrivate ? "Allow private repositories" : "Sign in to analyze private repos"}
            </a>
          )}
          <Link href="/app/new" className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-[13px] text-fg">
            Try another repository
          </Link>
        </div>
      </div>
    </div>
  );
}
