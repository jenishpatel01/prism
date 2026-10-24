"use client";

import { useMemo, useState } from "react";
import ExplorerScene from "@/components/canvas/ExplorerScene";
import type { Issue, RepoGraph } from "@/lib/analysisTypes";
import Icon from "../Icon";
import { SeverityBadge } from "../ui";

/** Full-screen 3D map plus a searchable file list and a details panel for the selected file. */
export default function RepositoryExplorer({ graph, issues }: { graph: RepoGraph; issues: Issue[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const { fanIn, fanOut, issuesByFile, color } = useMemo(() => {
    const fanIn = new Array(graph.nodes.length).fill(0);
    const fanOut = new Array(graph.nodes.length).fill(0);
    for (const [a, b] of graph.links) {
      fanOut[a]++;
      fanIn[b]++;
    }
    const issuesByFile = new Map<string, Issue[]>();
    for (const i of issues) {
      const path = i.location.replace(/:\d+$/, "");
      issuesByFile.set(path, [...(issuesByFile.get(path) ?? []), i]);
    }
    const color = new Map(graph.groups.map((g) => [g.name, g.color]));
    return { fanIn, fanOut, issuesByFile, color };
  }, [graph, issues]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return graph.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => !q || n.id.toLowerCase().includes(q))
      .sort((a, b) => b.n.risk - a.n.risk || b.n.complexity - a.n.complexity)
      .slice(0, 150);
  }, [graph, query]);

  const sel = selected !== null ? graph.nodes[selected] : null;
  const selIssues = sel ? issuesByFile.get(sel.id) ?? [] : [];
  const hover = hovered !== null ? graph.nodes[hovered] : null;

  return (
    <div className="grid gap-4 lg:h-[calc(100svh-180px)] lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* 3D map */}
      <div className="relative h-[60svh] overflow-hidden rounded-xl border border-line lg:h-full">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgb(91_140_255/0.12),transparent)]" />
        <ExplorerScene graph={graph} selected={selected} onSelect={setSelected} onHover={setHovered} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        <div className="pointer-events-none absolute left-4 top-4 font-mono text-[11px] text-fg-dim">
          Drag to orbit · scroll to zoom · click a file
        </div>
        {hover && (
          <div className="pointer-events-none absolute right-4 top-4 max-w-[60%] truncate rounded-md border border-line bg-bg-0/80 px-2.5 py-1.5 font-mono text-[12px] text-white backdrop-blur">
            {hover.id}
          </div>
        )}
        <ul className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {graph.groups.map((g) => (
            <li key={g.name} className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
              <span className="size-1.5 rounded-full" style={{ background: g.color, boxShadow: `0 0 8px ${g.color}` }} />
              {g.name} <span className="font-mono text-fg-dim">{g.count}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
            <span className="size-1.5 rounded-full bg-critical shadow-[0_0_8px_var(--critical)]" />
            High risk
          </li>
        </ul>
      </div>

      {/* Side panel */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-bg-1/85 backdrop-blur-md">
        {sel && selected !== null ? (
          <div className="border-b border-line p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="label" style={{ color: color.get(sel.group) }}>
                {sel.group}
              </p>
              <button type="button" onClick={() => setSelected(null)} className="text-fg-dim hover:text-white" aria-label="Clear selection">
                <Icon name="close" size={14} />
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-[13px] text-white">{sel.id}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="label text-[10px]">Complexity</dt>
                <dd className="mt-1 font-mono text-[18px] text-white">{sel.complexity}</dd>
              </div>
              <div>
                <dt className="label text-[10px]">Risk</dt>
                <dd className={`mt-1 font-mono text-[18px] ${sel.risk >= 70 ? "text-critical" : sel.risk >= 45 ? "text-warning" : "text-white"}`}>{sel.risk}</dd>
              </div>
              <div>
                <dt className="label text-[10px]">Imported by</dt>
                <dd className="mt-1 font-mono text-[18px] text-white">{fanIn[selected]}</dd>
              </div>
              <div>
                <dt className="label text-[10px]">Imports</dt>
                <dd className="mt-1 font-mono text-[18px] text-white">{fanOut[selected]}</dd>
              </div>
            </dl>
            <p className="label mt-5 text-[10px]">Findings in this file</p>
            {selIssues.length ? (
              <ul className="mt-2 space-y-2">
                {selIssues.slice(0, 6).map((i) => (
                  <li key={i.id} className="rounded-md border border-line px-3 py-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={i.severity} />
                      <span className="font-mono text-[11px] text-fg-dim">{i.location.match(/:(\d+)$/)?.[0] ?? ""}</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-snug text-fg">{i.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12.5px] text-fg-dim">None. This file looks clean.</p>
            )}
          </div>
        ) : (
          <div className="border-b border-line p-5">
            <p className="text-[14px] text-white">Select a file</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
              Click a node in the map or pick a file below. Node size is complexity; red means high risk; lines are imports.
            </p>
          </div>
        )}

        <div className="border-b border-line p-3">
          <label htmlFor="file-search" className="sr-only">
            Search files
          </label>
          <div className="relative">
            <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
            <input
              id="file-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${graph.nodes.length} files`}
              className="h-9 w-full rounded-md border border-line bg-bg-0/70 pl-9 pr-3 font-mono text-[12.5px] text-white outline-none placeholder:text-fg-dim focus:border-accent"
            />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1 max-lg:max-h-80">
          {list.map(({ n, i }) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={`flex w-full items-center gap-2.5 px-4 py-1.5 text-left transition-colors hover:bg-white/[0.04] ${i === selected ? "bg-white/[0.07]" : ""}`}
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: n.risk >= 70 ? "var(--critical)" : color.get(n.group) }} />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-muted" title={n.id}>
                  {n.id}
                </span>
                <span className="font-mono text-[11px] text-fg-dim">{n.complexity}</span>
              </button>
            </li>
          ))}
          {!list.length && <li className="px-4 py-6 text-center text-[12.5px] text-fg-dim">No files match.</li>}
        </ul>
      </aside>
    </div>
  );
}
