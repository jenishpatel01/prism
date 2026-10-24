"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";

const EXAMPLES = ["pmndrs/zustand", "expressjs/express", "vercel/swr", "pallets/flask"];

/** Accepts "owner/repo" or any github.com URL and opens that repository's analysis. */
export function parseRepo(input: string): { owner: string; repo: string } | null {
  const s = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/i) ?? s.match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export default function AnalyzeForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (input: string) => {
    const parsed = parseRepo(input);
    if (!parsed) {
      setError("Enter a GitHub repository like owner/name or a github.com link.");
      return;
    }
    setError("");
    setBusy(true);
    router.push(`/app/r/${parsed.owner}/${parsed.repo}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="repo" className="sr-only">
          GitHub repository
        </label>
        <div className="relative flex-1">
          <Icon name="repository" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input
            id="repo"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="github.com/owner/repository"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-lg border border-line-strong bg-bg-0/70 pl-11 pr-4 font-mono text-[14px] text-white outline-none transition-colors placeholder:text-fg-dim focus:border-accent focus:shadow-[0_0_0_4px_rgb(91_140_255/0.15)]"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 font-mono text-[12px] font-medium tracking-[0.12em] text-bg-0 shadow-[0_0_30px_rgb(91_140_255/0.4)] transition-shadow hover:shadow-[0_0_44px_rgb(91_140_255/0.65)] disabled:opacity-60"
        >
          {busy ? "OPENING…" : "ANALYZE"}
        </button>
      </form>
      {error && <p className="mt-3 text-[13px] text-critical">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="label mr-1">Try</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => go(ex)}
            className="rounded-md border border-line px-2.5 py-1 font-mono text-[12px] text-fg-muted transition-colors hover:border-line-strong hover:text-white"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
