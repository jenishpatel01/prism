"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/dom/Logo";
import { navCounts, repo } from "@/lib/demoAnalysis";
import Icon from "./Icon";
import { NAV } from "./nav";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="App" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const count = navCounts[item.key];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors ${
              active ? "bg-white/[0.07] text-white" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"
            }`}
          >
            {active && <span className="absolute -left-3 top-2 bottom-2 w-0.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
            <Icon name={item.icon} size={17} className={active ? "text-white" : "text-fg-dim group-hover:text-fg-muted"} />
            <span className="flex-1">{item.label}</span>
            {count && (
              <span
                className={`rounded px-1.5 font-mono text-[11px] ${
                  count.tone === "critical" ? "bg-critical/15 text-critical" : "bg-white/[0.06] text-fg-muted"
                }`}
              >
                {count.value}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function RepoSwitcher() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg border border-line bg-bg-1/80 px-3 py-2.5 text-left transition-colors hover:border-line-strong"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-violet font-mono text-[11px] font-medium text-white">
        {repo.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-fg">
          {repo.owner}/{repo.name}
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px] text-fg-dim">
          <Icon name="branch" size={12} />
          {repo.branch}
        </span>
      </span>
      <Icon name="chevron" size={16} className="text-fg-dim" />
    </button>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <Link href="/" className="px-2 text-fg" aria-label="PRISM home">
        <Logo />
      </Link>
      <RepoSwitcher />
      <div className="px-3">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="mt-auto space-y-3">
        <div className="rounded-lg border border-line bg-bg-1/60 p-3.5">
          <p className="label text-[10px]">Demo workspace</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-fg-muted">You&apos;re exploring sample data. Connect GitHub to analyze your own code.</p>
          <a href="#" className="mt-3 inline-flex text-[12.5px] text-accent hover:text-white">
            Connect GitHub →
          </a>
        </div>
        <div className="flex items-center gap-3 px-2">
          <span className="grid size-7 place-items-center rounded-full bg-white/10 font-mono text-[10px] text-fg">DU</span>
          <span className="flex-1 text-[13px] text-fg-muted">Demo user</span>
          <Icon name="settings" size={16} className="text-fg-dim" />
        </div>
      </div>
    </div>
  );
}

/** Fixed sidebar on large screens; a top bar with a slide-out menu below that. */
export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] border-r border-line bg-bg-0/70 backdrop-blur-xl lg:block">
        <SidebarBody />
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
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
