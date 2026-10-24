import Universe from "@/components/canvas/Universe";
import type { AnalysisResult } from "@/lib/analysisTypes";
import { CLUSTERS } from "@/lib/demoRepo";
import { Panel, PanelLink } from "../ui";

/** Live 3D map of the repository. The panel has no fill so the shared canvas shows through. */
export default function RepoMap({ data, base }: { data: AnalysisResult; base: string }) {
  const legend = data.graph ? data.graph.groups.map((g) => ({ name: g.name, color: g.color })) : CLUSTERS.map((c) => ({ name: c.name, color: c.color }));
  const count = data.graph?.nodes.length;
  return (
    <Panel
      title={count ? `Repository map · ${count} files` : "Repository map"}
      action={<PanelLink href={`${base}/repository`}>Explore</PanelLink>}
      bare
      className="overflow-hidden"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgb(91_140_255/0.14),transparent)]" />
      <Universe graph={data.graph} className="relative -mx-5 -mb-5 h-[300px] md:h-[340px]" />
      <ul className="pointer-events-none absolute bottom-4 left-5 right-5 flex flex-wrap gap-x-4 gap-y-1.5">
        {legend.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
            <span className="size-1.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
            {c.name}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
          <span className="size-1.5 rounded-full bg-critical shadow-[0_0_8px_var(--critical)]" />
          High risk
        </li>
      </ul>
    </Panel>
  );
}
