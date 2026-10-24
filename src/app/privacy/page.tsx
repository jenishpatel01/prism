import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/dom/Logo";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What PRISM collects, why, who it is shared with and how to delete it.",
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-[19px] font-medium tracking-[-0.01em] text-white">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">{children}</p>;
const LI = ({ children }: { children: React.ReactNode }) => <li className="text-[14.5px] leading-relaxed text-fg-muted">{children}</li>;

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <Link href="/" aria-label="PRISM home" className="text-fg">
        <Logo />
      </Link>
      <p className="label mt-12 text-accent">Legal</p>
      <h1 className="mt-3 text-[34px] font-medium tracking-[-0.03em] text-white md:text-[44px]">Privacy policy</h1>
      <p className="mt-3 font-mono text-[12px] text-fg-dim">Last updated: 24 October 2026</p>

      <P>
        PRISM analyzes the structure, security, dependencies and performance of GitHub repositories. This page explains what it collects, why, who it is shared
        with and how you can delete it. In short: PRISM never stores your source code, and you can delete everything yourself at any time.
      </P>

      <H>What PRISM collects</H>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <LI>
          <span className="text-fg">When you sign in with GitHub:</span> your GitHub numeric ID, username, display name and avatar link. PRISM asks GitHub for
          read-only access to your public profile. If you choose &quot;Allow private repositories&quot;, it also asks for GitHub&apos;s <code className="font-mono text-[13px] text-white">repo</code> scope,
          which GitHub only offers as read and write; PRISM only ever reads.
        </LI>
        <LI>
          <span className="text-fg">An access token:</span> kept only in an encrypted, HTTP-only cookie in your browser. It is not stored in PRISM&apos;s database.
        </LI>
        <LI>
          <span className="text-fg">Your analyses (signed-in users only):</span> the result of each analysis, meaning the repository name, commit, score, grade, issue titles,
          file paths, metrics and the AI summary. Repository files are downloaded temporarily to analyze them and are not kept.
        </LI>
        <LI>
          <span className="text-fg">Signed-out visitors:</span> analyses of public repositories are not saved to an account. Hosting providers keep normal technical logs (such as IP address and
          time of request).
        </LI>
      </ul>

      <H>How it is used</H>
      <P>
        To sign you in, to show your repositories and analyses, to keep your history and score trends, and to write plain-language explanations of the findings. PRISM does not sell your data,
        show ads or build advertising profiles.
      </P>

      <H>Who it is shared with</H>
      <P>These services process data on PRISM&apos;s behalf:</P>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <LI>GitHub: sign-in and reading repositories you choose to analyze.</LI>
        <LI>Supabase: the database that holds your profile and saved analyses.</LI>
        <LI>Vercel: hosting of the website and its server.</LI>
        <LI>
          Google (Gemini) or Anthropic (Claude): they receive only analysis facts, such as issue titles, file paths and metrics, to write the summary. They never receive your source code.
        </LI>
      </ul>

      <H>Cookies</H>
      <P>
        PRISM uses one sign-in cookie (encrypted, HTTP-only) and a short-lived cookie while you sign in. There are no advertising or tracking cookies. The cookie stays until you sign out,
        for up to 180 days.
      </P>

      <H>Your choices</H>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <LI>
          <span className="text-fg">Sign out:</span> ends your session and removes PRISM&apos;s access to your GitHub account.
        </LI>
        <LI>
          <span className="text-fg">Delete your data:</span> open{" "}
          <Link href="/app/account" className="text-accent hover:text-white">
            Your data
          </Link>{" "}
          while signed in and choose &quot;Delete my account and data&quot;. This permanently removes your profile and all saved analyses and revokes PRISM&apos;s GitHub access.
        </LI>
        <LI>
          <span className="text-fg">Revoke access yourself:</span> at github.com/settings/applications you can remove PRISM at any time.
        </LI>
      </ul>

      <H>Security</H>
      <P>
        Sessions are encrypted with AES-256-GCM, connections use HTTPS, and database tables are locked so that only PRISM&apos;s server can read them. No system is perfectly secure, but PRISM keeps
        the data it holds to a minimum.
      </P>

      <H>Children</H>
      <P>PRISM is a developer tool and is not directed at children under 13.</P>

      <H>Changes and contact</H>
      <P>
        If this policy changes, the date above changes. Questions or requests: open an issue at{" "}
        <a href="https://github.com/jenishpatel01/prism/issues" className="text-accent hover:text-white">
          github.com/jenishpatel01/prism/issues
        </a>
        .
      </P>
    </main>
  );
}
