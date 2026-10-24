"use client";

import { useEffect, useState } from "react";

const STAGES = ["Downloading repository", "Parsing source files", "Building syntax trees", "Scanning for secrets", "Mapping dependencies", "Checking vulnerable packages", "Measuring quality", "Building the map"];

/**
 * Shown while a repository is being analyzed. The server doesn't stream
 * progress yet, so the stage list advances on a timer as a guide.
 */
export default function Analyzing() {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const parts = window.location.pathname.split("/");
    const i = parts.indexOf("r");
    const first = setTimeout(() => {
      if (i >= 0 && parts[i + 2]) setName(`${parts[i + 1]}/${parts[i + 2]}`);
    }, 0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STAGES.length - 1)), 2200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="grid min-h-[70svh] place-items-center py-10">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto size-48">
          <div aria-hidden="true" className="breathe absolute inset-[24%] rounded-full bg-[radial-gradient(closest-side,rgb(196_186_255/0.9),rgb(141_124_255/0.35)_45%,transparent)] blur-md" />
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden="true">
            <circle cx="100" cy="100" r="94" fill="none" stroke="rgb(141 124 255 / 0.45)" strokeDasharray="2 9" className="spin" />
            <circle cx="100" cy="100" r="76" fill="none" stroke="rgb(94 230 255 / 0.6)" strokeWidth="1.5" strokeDasharray="40 30 8 30" className="spin" style={{ animationDuration: "14s", animationDirection: "reverse" }} />
            <circle cx="100" cy="100" r="76" fill="none" stroke="#fff" strokeWidth="2.5" pathLength={100} strokeDasharray="8 92" className="spin" style={{ animationDuration: "2.4s" }} />
          </svg>
        </div>
        <p className="label mt-8 text-fg">PRISM core · analyzing</p>
        <p className="mt-3 font-mono text-[18px] text-white">{name || "repository"}</p>
        <ol className="mt-8 space-y-2 text-left">
          {STAGES.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 font-mono text-[12.5px] transition-colors ${i < step ? "text-fg-muted" : i === step ? "text-white" : "text-fg-dim"}`}>
              <span className={`grid size-4 place-items-center rounded-full border ${i < step ? "border-accent bg-accent/20" : i === step ? "border-white" : "border-line-strong"}`}>
                {i === step && <span className="breathe size-1.5 rounded-full bg-white" />}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
