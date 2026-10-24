"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** The exact callback URL to register in the GitHub OAuth app, for wherever this page is open. */
export function CallbackUrl() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setUrl(`${window.location.origin}/api/auth/callback`), 0);
    return () => clearTimeout(id);
  }, []);
  return (
    <span className="mt-2 flex flex-wrap items-center gap-2">
      <code className="rounded-md border border-line bg-bg-0/70 px-2.5 py-1.5 font-mono text-[12.5px] text-white">{url || "…"}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="rounded-md border border-line px-2 py-1 text-[12px] text-fg-muted hover:text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

/** Shows why a sign-in attempt failed (passed back from the callback route). */
export function AuthErrorBanner() {
  const error = useSearchParams().get("auth_error");
  if (!error) return null;
  return (
    <div className="rounded-xl border border-critical/40 bg-critical/10 px-5 py-4 text-[13.5px] text-fg">
      <p className="label text-critical">Sign-in failed</p>
      <p className="mt-1.5">{error}</p>
    </div>
  );
}
