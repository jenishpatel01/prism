import type { ReactNode } from "react";
import Link from "next/link";
import Hero from "@/components/dom/Hero";
import Nav from "@/components/dom/Nav";
import Logo from "@/components/dom/Logo";
import Universe from "@/components/canvas/Universe";
import { CLUSTERS } from "@/lib/demoRepo";
import SecurityVisual from "@/components/visuals/SecurityVisual";
import PerformanceVisual from "@/components/visuals/PerformanceVisual";
import ArchitectureVisual from "@/components/visuals/ArchitectureVisual";
import CoreVisual from "@/components/visuals/CoreVisual";

const pipeline = [
  "Repository",
  "Parsing",
  "AST analysis",
  "Static analysis",
  "Security scanning",
  "Dependency graph",
  "Performance metrics",
  "Quality metrics",
  "Claude interpretation",
  "Visual intelligence",
];

function ChapterText({
  index,
  label,
  title,
  body,
  accent,
  facts,
}: {
  index: string;
  label: string;
  title: ReactNode;
  body: string;
  accent: string;
  facts?: [string, string][];
}) {
  return (
    <div>
      <p className="label flex items-center gap-3">
        <span className="h-px w-8" style={{ background: accent }} />
        <span style={{ color: accent }}>{index}</span>
        <span className="text-fg">{label}</span>
      </p>
      <h2 className="mt-6 text-[clamp(32px,4.2vw,60px)] font-medium leading-[1.03] tracking-[-0.035em] text-white">{title}</h2>
      <p className="mt-6 max-w-[34rem] text-[16px] leading-relaxed text-fg-muted">{body}</p>
      {facts && (
        <dl className="mt-10 grid max-w-[34rem] grid-cols-2 gap-6 border-t border-line pt-6">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dd className="font-mono text-[22px] text-white">{v}</dd>
              <dt className="label mt-1">{k}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />

        {/* 01 — Repository universe (3D) */}
        <section id="universe" className="relative px-4 pb-24 pt-28 md:px-10 md:pb-32 md:pt-36">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <ChapterText
                index="01"
                label="Repository universe"
                accent="var(--accent)"
                title={
                  <>
                    Every file is a node. <span className="text-spectrum">Every import, a connection.</span>
                  </>
                }
                body="Connect a repository and PRISM builds a living map of it. Node size shows complexity, links show dependencies, and risk glows red. Fly in to any module to see why it matters."
                facts={[
                  ["Files mapped", "4,812"],
                  ["Dependencies", "18,421"],
                ]}
              />
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                {CLUSTERS.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-[13px] text-fg-muted">
                    <span className="size-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
                    {c.name}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-[13px] text-fg-muted">
                  <span className="size-2 rounded-full bg-critical shadow-[0_0_10px_var(--critical)]" />
                  High risk
                </li>
              </ul>
            </div>
            <div className="relative md:col-span-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgb(91_140_255/0.16),transparent)]"
              />
              <Universe className="relative h-[60svh] w-full md:h-[75svh]" />
            </div>
          </div>
        </section>

        {/* 02 — Security */}
        <section id="security" className="relative border-t border-line px-4 py-24 md:px-10 md:py-36">
          <div className="grid items-center gap-14 md:grid-cols-12">
            <div className="md:col-span-5">
              <ChapterText
                index="02"
                label="Security layer"
                accent="var(--critical)"
                title="A vulnerability is never one line. See how far it reaches."
                body="PRISM traces each finding through the dependency graph, so you see every file that inherits the risk, not just the line where it starts."
              />
            </div>
            <div className="md:col-span-7">
              <SecurityVisual />
            </div>
          </div>
        </section>

        {/* 03 — Performance */}
        <section id="performance" className="relative border-t border-line px-4 py-24 md:px-10 md:py-36">
          <div className="grid items-center gap-14 md:grid-cols-12">
            <div className="md:order-2 md:col-span-5 md:col-start-8">
              <ChapterText
                index="03"
                label="Performance layer"
                accent="var(--accent-cyan)"
                title="Find the bottleneck before your users do."
                body="An N+1 query in OrderService.list() holds every request at the database. PRISM pinpoints it and proposes a batched, indexed path."
                facts={[
                  ["Current p95", "842ms"],
                  ["Optimized p95", "127ms"],
                ]}
              />
            </div>
            <div className="md:order-1 md:col-span-7">
              <PerformanceVisual />
            </div>
          </div>
        </section>

        {/* 04 — Architecture */}
        <section id="architecture" className="relative border-t border-line px-4 py-24 md:px-10 md:py-36">
          <div className="grid items-center gap-14 md:grid-cols-12">
            <div className="md:col-span-5">
              <ChapterText
                index="04"
                label="Architecture layer"
                accent="var(--accent-violet)"
                title="Your architecture as it really is, not as the diagram says."
                body="Modules grow with their importance. Dependencies flow between layers in real time. The modules carrying the most risk pull focus, so you know where to start."
              />
            </div>
            <div className="md:col-span-7">
              <ArchitectureVisual />
            </div>
          </div>
        </section>

        {/* 05 — Core */}
        <section id="core" className="relative border-t border-line px-4 py-24 md:px-10 md:py-36">
          <div className="grid items-center gap-14 md:grid-cols-12">
            <div className="md:order-2 md:col-span-5 md:col-start-8">
              <ChapterText
                index="05"
                label="PRISM core"
                accent="var(--accent-violet)"
                title={
                  <>
                    Analysis finds the facts. <span className="text-spectrum">AI explains them.</span>
                  </>
                }
                body="PRISM isn't a chatbot reading your code. It parses every file, builds the graph, runs static and security analysis, then uses Claude to explain what the numbers mean."
              />
            </div>
            <div className="md:order-1 md:col-span-6">
              <CoreVisual />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="product" className="border-t border-line px-4 py-24 md:px-10 md:py-32">
          <p className="label text-fg">How PRISM sees</p>
          <h2 className="mt-5 max-w-3xl text-[clamp(28px,3.4vw,46px)] font-medium leading-[1.08] tracking-[-0.03em] text-white">
            Ten stages. Deterministic first, intelligent last.
          </h2>
          <ol className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
            {pipeline.map((step, i) => {
              const ai = i >= pipeline.length - 2;
              return (
                <li key={step} className="bg-bg-1 p-5 md:p-6">
                  <p className={`font-mono text-[12px] ${ai ? "text-accent-violet" : "text-fg-dim"}`}>{String(i + 1).padStart(2, "0")}</p>
                  <p className={`mt-8 text-[15px] ${ai ? "text-spectrum font-medium" : "text-fg"}`}>{step}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Final call to action */}
        <section className="relative overflow-hidden border-t border-line px-4 py-32 text-center md:px-10 md:py-44">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(91_140_255/0.28),transparent),radial-gradient(35%_45%_at_50%_100%,rgb(141_124_255/0.3),transparent)]"
          />
          <p className="label relative text-fg">Get started</p>
          <h2 className="relative mx-auto mt-6 max-w-4xl text-[clamp(44px,7vw,104px)] font-medium leading-[0.95] tracking-[-0.045em] text-white">
            Code, <span className="text-spectrum">understood.</span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-fg-muted">
            Connect a repository and see its first map in minutes.
          </p>
          <div className="relative mt-10 flex flex-wrap justify-center gap-3">
            {/* Starts GitHub sign-in (or opens the analyze page if sign-in isn't set up). */}
            { }
            <a
              href="/api/auth/login"
              className="inline-flex h-12 items-center rounded-md bg-white px-6 font-mono text-[12px] font-medium tracking-[0.12em] text-bg-0 shadow-[0_0_40px_rgb(91_140_255/0.45)] transition-shadow hover:shadow-[0_0_60px_rgb(91_140_255/0.7)]"
            >
              CONNECT GITHUB
            </a>
            <Link
              href="/app"
              className="inline-flex h-12 items-center rounded-md border border-line-strong bg-bg-0/40 px-6 font-mono text-[12px] tracking-[0.12em] text-white backdrop-blur transition-colors hover:border-fg-muted"
            >
              EXPLORE DEMO
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative flex flex-col items-start justify-between gap-4 border-t border-line bg-bg-0 px-4 py-8 text-fg-muted sm:flex-row sm:items-center md:px-10">
        <Logo className="text-fg" />
        <p className="label">© 2026 PRISM · See your code differently</p>
      </footer>
    </>
  );
}
