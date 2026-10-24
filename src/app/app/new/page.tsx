import type { Metadata } from "next";
import AnalyzeForm from "@/components/app/AnalyzeForm";

export const metadata: Metadata = { title: "Analyze a repository" };

const STEPS = [
  ["Download", "PRISM fetches the default branch of the public repository."],
  ["Parse", "Every JavaScript, TypeScript and Python file is parsed into a syntax tree."],
  ["Analyze", "Complexity, imports, secrets, risky patterns and vulnerable dependencies."],
  ["Map", "Results become your dashboard and a 3D map of the codebase."],
];

export default function NewAnalysisPage() {
  return (
    <div className="mx-auto max-w-3xl pt-6 md:pt-16">
      <p className="label text-accent">New analysis</p>
      <h1 className="mt-4 text-[clamp(34px,5vw,56px)] font-medium leading-[1.02] tracking-[-0.04em] text-white">
        See any repository <span className="text-spectrum">differently.</span>
      </h1>
      <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-fg-muted">
        Paste a public GitHub repository. PRISM downloads it, analyzes the code and builds its map. Most repositories take under a minute.
      </p>

      <div className="mt-10 rounded-2xl border border-line bg-bg-1/80 p-5 backdrop-blur-md md:p-7">
        <AnalyzeForm />
      </div>

      <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="bg-bg-1/80 p-5">
            <p className="font-mono text-[12px] text-accent">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-5 text-[15px] text-white">{title}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-[12.5px] leading-relaxed text-fg-dim">
        Public repositories only for now. Private repositories arrive with GitHub sign-in. The code is analyzed in memory and not stored.
      </p>
    </div>
  );
}
