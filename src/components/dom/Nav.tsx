import Link from "next/link";
import Logo from "./Logo";

const links = ["Product", "Universe", "Docs", "Changelog"];

export default function Nav() {
  return (
    <header
      data-intro="nav"
      className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg-0/55 opacity-0 backdrop-blur-md"
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-10">
        <Link href="/" aria-label="PRISM home" className="text-fg">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="text-[13px] text-fg-muted transition-colors hover:text-fg"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          <Link href="/app" className="hidden text-[13px] text-fg-muted transition-colors hover:text-fg sm:block">
            Demo app
          </Link>
          {/* Starts GitHub sign-in (or opens the analyze page if sign-in isn't set up). */}
          { }
          <a
            href="/api/auth/login"
            className="inline-flex h-8 items-center rounded-md border border-line-strong px-3.5 text-[12px] text-fg transition-colors hover:border-fg-muted"
          >
            Connect GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
