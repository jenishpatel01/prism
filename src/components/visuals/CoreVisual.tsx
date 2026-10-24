"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/lib/useInView";

const COUNTS = [
  { label: "Functions", value: 14823 },
  { label: "Classes", value: 3204 },
  { label: "Dependencies", value: 18421 },
];

const ISSUES = [
  { label: "Critical", value: 7, color: "var(--critical)" },
  { label: "Performance", value: 11, color: "var(--accent-cyan)" },
  { label: "Maintainability", value: 5, color: "var(--accent-violet)" },
];

const SCAN_MS = 2600;

/** Counts up from 0 to the value over the scan duration once started. */
function useCount(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / SCAN_MS, 1);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

function Count({ label, value, run }: { label: string; value: number; run: boolean }) {
  const n = useCount(value, run);
  return (
    <div>
      <p className="font-mono text-[22px] font-medium tabular-nums text-fg sm:text-[28px]">{n.toLocaleString("en-US")}</p>
      <p className="label mt-1">{label}</p>
    </div>
  );
}

export default function CoreVisual() {
  const [ref, active] = useInView<HTMLDivElement>(0.35);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setDone(true), SCAN_MS + 200);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <div ref={ref}>
      <div className="relative mx-auto aspect-square w-full max-w-[460px]">
        {/* Core light */}
        <div
          aria-hidden="true"
          className="breathe absolute inset-[22%] rounded-full bg-[radial-gradient(closest-side,rgb(196_186_255/0.9),rgb(141_124_255/0.35)_45%,transparent)] blur-md"
        />
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="200" cy="200" r="190" fill="none" stroke="rgb(141 124 255 / 0.45)" strokeWidth="1" strokeDasharray="2 10" className="spin" />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="rgb(94 230 255 / 0.55)"
            strokeWidth="1.5"
            strokeDasharray="60 40 10 40"
            className="spin"
            style={{ animationDuration: "26s", animationDirection: "reverse" }}
          />
          <circle
            cx="200"
            cy="200"
            r="128"
            fill="none"
            stroke="rgb(255 255 255 / 0.5)"
            strokeWidth="1"
            strokeDasharray="1 6"
            className="spin"
            style={{ animationDuration: "16s" }}
          />
          {/* Scan sweep */}
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            pathLength={100}
            strokeDasharray="8 92"
            className="spin"
            style={{ animationDuration: "3s", opacity: done ? 0 : 1, transition: "opacity .6s" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="label text-fg">PRISM core</p>
            <p className={`mt-2 font-mono text-[13px] tracking-[0.14em] ${done ? "text-accent-cyan" : "text-fg-muted"}`}>
              {done ? "ANALYSIS COMPLETE" : active ? "ANALYZING…" : "STANDBY"}
            </p>
            <p
              className="mt-3 text-[44px] font-medium leading-none tracking-[-0.03em] text-white transition-opacity duration-700 sm:text-[56px]"
              style={{ opacity: done ? 1 : 0 }}
            >
              23
            </p>
            <p className="label mt-1 transition-opacity duration-700" style={{ opacity: done ? 1 : 0 }}>
              Issues found
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6">
        {COUNTS.map((c) => (
          <Count key={c.label} {...c} run={active} />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {ISSUES.map((i, k) => (
          <div key={i.label} className="grid grid-cols-[120px_1fr_28px] items-center gap-4 sm:grid-cols-[150px_1fr_28px]">
            <span className="label">{i.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full"
                style={{
                  background: i.color,
                  width: done ? `${(i.value / 11) * 100}%` : "0%",
                  transition: `width 1s var(--ease-out) ${k * 0.15}s`,
                }}
              />
            </span>
            <span className="text-right font-mono text-[13px] text-fg">{done ? i.value : "–"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
