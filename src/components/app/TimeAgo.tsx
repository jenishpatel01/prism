"use client";

import { useEffect, useState } from "react";

function format(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

/** Relative time, computed in the browser so cached pages never show a stale label. */
export default function TimeAgo({ iso, fallback }: { iso: string; fallback?: string }) {
  const [label, setLabel] = useState(fallback ?? "");
  useEffect(() => {
    const update = () => setLabel(format(iso));
    const first = setTimeout(update, 0);
    const id = setInterval(update, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [iso]);
  return <span suppressHydrationWarning>{label}</span>;
}
