import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Your data" };

async function Body({ searchParams }: { searchParams: PageProps<"/app/account">["searchParams"] }) {
  await connection(); // depends on who is signed in
  const error = (await searchParams).error === "1";
  const session = await getSession();

  if (!session) {
    return (
      <section className="rounded-xl border border-line bg-bg-1/85 p-5 backdrop-blur-md md:p-6">
        <p className="text-[15px] text-white">Sign in to see or delete your data.</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
          PRISM only stores data for people who sign in with GitHub. If you never signed in, there is nothing to delete.
        </p>
        { }
        <a href="/api/auth/login?returnTo=/app/account" className="mt-4 inline-flex h-9 items-center rounded-md bg-white px-3.5 text-[13px] font-medium text-bg-0">
          Sign in with GitHub
        </a>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-[13.5px] text-warning">
          Your data couldn&apos;t be deleted just now. You are still signed in, so please try again in a moment.
        </p>
      )}

      <section className="rounded-xl border border-line bg-bg-1/85 p-5 backdrop-blur-md md:p-6">
        <p className="text-[15px] text-white">
          What PRISM keeps for <span className="font-mono">@{session.login}</span>
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-fg-muted">
          <li>Your GitHub profile: numeric ID, username, display name and avatar link.</li>
          <li>Every analysis you ran while signed in: score, grade, issue titles and file paths, and the AI summary. Never your source code.</li>
          <li>A sign-in cookie in your browser with an encrypted access token. It is removed when you sign out or delete your data.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-critical/30 bg-bg-1/85 p-5 backdrop-blur-md md:p-6">
        <p className="text-[15px] text-white">Delete my account and data</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
          This permanently deletes your profile and all saved analyses from PRISM, removes PRISM&apos;s access to your GitHub account and signs you out. It cannot be
          undone. Repositories on GitHub are never touched.
        </p>
        <form action="/api/account/delete" method="post" className="mt-4 space-y-4">
          <label className="flex items-start gap-2.5 text-[13.5px] text-fg">
            <input type="checkbox" required className="mt-1 size-4 accent-[#ff5c6c]" />
            <span>I understand this deletes my PRISM data permanently.</span>
          </label>
          <button type="submit" className="inline-flex h-9 items-center rounded-md border border-critical/50 bg-critical/10 px-3.5 text-[13px] font-medium text-critical hover:bg-critical/20">
            Delete my account and data
          </button>
        </form>
      </section>
    </div>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/app/account">) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="label text-accent">Account</p>
        <h1 className="mt-3 text-[30px] font-medium tracking-[-0.03em] text-white md:text-[36px]">Your data</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          See what PRISM stores about you and delete it at any time. Read the{" "}
          <Link href="/privacy" className="text-accent hover:text-white">
            privacy policy
          </Link>
          .
        </p>
      </div>
      <Suspense fallback={<p className="text-[13px] text-fg-dim">Loading…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
