"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/dom/Logo";
import { demoNavCounts, demoResult } from "@/lib/demoAnalysis";
import type { PublicUser } from "@/server/session";
import Icon from "./Icon";
import { NAV } from "./nav";

/** Works out which repository the current URL belongs to: /app/r/<owner>/<repo>/... or the demo. */
function useWorkspace() {
  const pathname = usePathname();
  const m = pathname.match(/^\/app\/r\/([^/]+)\/([^/]+)/);
  if (m) {
    const owner = decodeURIComponent(m[1]);
    const name = decodeURIComponent(m[2]);
    return { base: `/app/r/${m[1]}/${m[2]}`, owner, name, branch: "default branch", demo: false, pathname };
  }
  return { base: "/app", owner: demoResult.repo.owner, name: demoResult.repo.name, branch: demoResult.repo.branch, demo: true, pathname };
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const ws = useWorkspace();

  return (
    <nav aria-label="App" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const href = item.href === "/app" ? ws.base : ws.base + item.href.slice("/app".length);
        const active = item.href === "/app" ? ws.pathname === ws.base : ws.pathname.startsWith(href);
        const count = ws.demo ? demoNavCounts[item.key] : undefined;
        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors ${
              active ? "bg-white/[0.07] text-white" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"
            }`}
          >
            {active && <span className="absolute -left-3 bottom-2 top-2 w-0.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
            <Icon name={item.icon} size={17} className={active ? "text-white" : "text-fg-dim group-hover:text-fg-muted"} />
            <span className="flex-1">{item.label}</span>
            {count && (
              <span className={`rounded px-1.5 font-mono text-[11px] ${count.tone === "critical" ? "bg-critical/15 text-critical" : "bg-white/[0.06] text-fg-muted"}`}>
                {count.value}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function RepoSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const ws = useWorkspace();
  return (
    <Link
      href="/app/new"
      onClick={onNavigate}
      className="flex w-full items-center gap-3 rounded-lg border border-line bg-bg-1/80 px-3 py-2.5 text-left transition-colors hover:border-line-strong"
      title="Analyze another repository"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-violet font-mono text-[11px] font-medium text-white">
        {ws.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-fg">
          {ws.owner}/{ws.name}
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px] text-fg-dim">
          <Icon name="branch" size={12} />
          {ws.demo ? `${ws.branch} · demo` : ws.branch}
        </span>
      </span>
      <Icon name="chevron" size={16} className="text-fg-dim" />
    </Link>
  );
}

type SidebarProps = { user: PublicUser | null; authEnabled: boolean };

function Account({ user, authEnabled, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  if (user) {
    return (
      <div className="flex items-center gap-3 px-2">
        {/* GitHub avatar; a plain img avoids configuring remote image domains. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" width={28} height={28} className="size-7 rounded-full border border-line" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-fg">{user.name ?? user.login}</span>
          <span className="block truncate font-mono text-[11px] text-fg-dim">@{user.login}</span>
        </span>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded-md px-1.5 py-1 text-[11.5px] text-fg-dim hover:text-white" title="Sign out">
            Sign out
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {authEnabled && (
        // Route handler that redirects to GitHub, so a plain link is right here.
        <a href="/api/auth/login" className="flex h-9 items-center justify-center gap-2 rounded-md bg-white text-[13px] font-medium text-bg-0">
          Sign in with GitHub
        </a>
      )}
      <div className="flex items-center gap-3 px-2">
        <span className="grid size-7 place-items-center rounded-full bg-white/10 font-mono text-[10px] text-fg">G</span>
        <span className="flex-1 text-[13px] text-fg-muted">Guest</span>
        <Link href="/app/setup" onClick={onNavigate} title="Setup" aria-label="Setup" className="text-fg-dim hover:text-white">
          <Icon name="settings" size={16} />
        </Link>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate, user, authEnabled }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const extra = [
    ...(user ? [{ href: "/app/repos", label: "Your repositories", icon: "repository" as const }] : []),
    { href: "/app/new", label: "New analysis", icon: "search" as const },
    { href: "/app/setup", label: "Setup", icon: "settings" as const },
  ];
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5">
      <Link href="/" className="px-2 text-fg" aria-label="PRISM home">
        <Logo />
      </Link>
      <RepoSwitcher onNavigate={onNavigate} />
      <div className="px-3">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="border-t border-line px-3 pt-4">
        <p className="label mb-2 px-3 text-[10px]">Workspace</p>
        <nav aria-label="Workspace" className="flex flex-col gap-0.5">
          {extra.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-3 rounded-md px-3 text-[13px] transition-colors ${active ? "bg-white/[0.07] text-white" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"}`}
              >
                <Icon name={l.icon} size={16} className={active ? "text-white" : "text-fg-dim"} />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto">
        <Account user={user} authEnabled={authEnabled} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** Static shell shown while the current URL is resolved. */
export function SidebarFallback() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] border-r border-line bg-bg-0/70 px-6 py-5 backdrop-blur-xl lg:block">
        <Logo className="text-fg" />
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-bg-0/75 px-4 backdrop-blur-xl lg:hidden">
        <Logo className="text-fg" />
      </header>
    </>
  );
}

/** Fixed sidebar on large screens; a top bar with a slide-out menu below that. */
export default function Sidebar({ user, authEnabled }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] border-r border-line bg-bg-0/70 backdrop-blur-xl lg:block">
        <SidebarBody user={user} authEnabled={authEnabled} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg-0/75 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="text-fg" aria-label="PRISM home">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-md border border-line text-fg"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Icon name="menu" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-bg-0">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 grid size-8 place-items-center rounded-md text-fg-muted hover:text-fg"
              aria-label="Close menu"
            >
              <Icon name="close" size={16} />
            </button>
            <SidebarBody user={user} authEnabled={authEnabled} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
