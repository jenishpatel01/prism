import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthErrorBanner, CallbackUrl } from "@/components/app/setup/SetupClient";
import { features } from "@/server/config";
import { checkDatabase } from "@/server/db";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Setup" };

type State = "ok" | "missing" | "warn";

function Badge({ state, children }: { state: State; children: ReactNode }) {
  const style = state === "ok" ? "bg-success/12 text-success ring-success/30" : state === "warn" ? "bg-warning/12 text-warning ring-warning/30" : "bg-white/[0.06] text-fg-muted ring-white/10";
  return <span className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] ring-1 ring-inset ${style}`}>{children}</span>;
}

function Card({ n, title, state, status, children }: { n: string; title: string; state: State; status: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-bg-1/85 p-5 backdrop-blur-md md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-accent">{n}</span>
          <span className="text-[17px] font-medium text-white">{title}</span>
        </p>
        <Badge state={state}>
          {state === "ok" ? "●" : "○"} {status}
        </Badge>
      </div>
      <div className="mt-4 space-y-2 text-[13.5px] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

const Var = ({ children }: { children: ReactNode }) => <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-white">{children}</code>;

async function Status() {
  await connection(); // always check the live configuration, never a build-time snapshot
  const f = features();
  const [dbCheck, session] = await Promise.all([f.db ? checkDatabase() : Promise.resolve(null), getSession()]);

  const authState: State = f.auth ? "ok" : f.authPartial ? "warn" : "missing";
  const authStatus = f.auth ? "Configured" : f.authSecretTooShort ? "AUTH_SECRET too short" : f.authPartial ? "Partly configured" : "Not set";

  return (
    <div className="space-y-4">
      <Card n="01" title="GitHub sign-in" state={authState} status={authStatus}>
        <p>
          Lets people sign in, see their repositories and analyze private ones. Needs <Var>GITHUB_CLIENT_ID</Var>, <Var>GITHUB_CLIENT_SECRET</Var> and{" "}
          <Var>AUTH_SECRET</Var> (any random text of 32+ characters).
        </p>
        <p>Callback URL to register in your GitHub OAuth app:</p>
        <CallbackUrl />
        {session ? (
          <form action="/api/auth/logout" method="post" className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-fg">
              Signed in as <span className="font-mono text-white">@{session.login}</span>
              {session.scopes.includes("repo") ? " · private repos allowed" : " · public repos only"}
            </span>
            <button type="submit" className="rounded-md border border-line px-2.5 py-1 text-[12px] text-fg-muted hover:text-white">
              Sign out
            </button>
          </form>
        ) : (
          f.auth && (
            <p className="pt-2">
              { }
              <a href="/api/auth/login?returnTo=/app/setup" className="inline-flex h-9 items-center rounded-md bg-white px-3.5 text-[13px] font-medium text-bg-0">
                Test: sign in with GitHub
              </a>
            </p>
          )
        )}
      </Card>

      <Card n="02" title="Database (Supabase)" state={dbCheck ? (dbCheck.ok ? "ok" : "warn") : "missing"} status={dbCheck ? (dbCheck.ok ? "Connected" : "Can't connect") : "Not set"}>
        <p>
          Saves every analysis a signed-in user runs, so History and score trends work. Needs <Var>DATABASE_URL</Var>: in Supabase use the{" "}
          <span className="text-fg">Transaction pooler</span> connection string (port 6543). Tables are created automatically.
        </p>
        {dbCheck && <p className={dbCheck.ok ? "text-success" : "text-warning"}>{dbCheck.message}</p>}
      </Card>

      <Card n="03" title="AI summaries" state={f.ai ? "ok" : "missing"} status={f.ai ? "Key present" : "Not set"}>
        <p>
          Writes the Overview summary and the AI Review: why each finding matters and how to fix it. Set <Var>ANTHROPIC_API_KEY</Var> to use{" "}
          <span className="font-mono text-fg">claude-sonnet-5-5</span>, or <Var>GEMINI_API_KEY</Var> (free at aistudio.google.com) to use Google&apos;s free Gemini tier.
          Only analysis facts are sent, never source code. Each repository commit is reviewed once, then cached.
        </p>
      </Card>

      <Card n="04" title="GitHub API token (optional)" state={f.githubToken ? "ok" : "missing"} status={f.githubToken ? "Present" : "Not set"}>
        <p>
          Raises GitHub&apos;s limit for analyzing public repositories while signed out, from 60 to 5,000 requests per hour. Set <Var>GITHUB_TOKEN</Var> to a
          fine-grained token with read-only access to public repositories.
        </p>
      </Card>
    </div>
  );
}

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="label text-accent">Setup</p>
        <h1 className="mt-3 text-[30px] font-medium tracking-[-0.03em] text-white md:text-[36px]">Connect PRISM&apos;s services</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          Add each value to <Var>.env.local</Var> (locally) or your Vercel project&apos;s Environment Variables, then restart the server or redeploy. This page
          checks them live. Values themselves are never shown.
        </p>
      </div>
      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>
      <Suspense fallback={<p className="text-[13px] text-fg-dim">Checking configuration…</p>}>
        <Status />
      </Suspense>
    </div>
  );
}
