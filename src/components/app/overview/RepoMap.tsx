import Universe from "@/components/canvas/Universe";
import { CLUSTERS } from "@/lib/demoRepo";
import { Panel, PanelLink } from "../ui";

/** Live 3D map of the repository. The panel has no fill so the shared canvas shows through. */
export default function RepoMap() {
  return (
    <Panel title="Repository map" action={<PanelLink href="/app/repository">Explore</PanelLink>} bare className="overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgb(91_140_255/0.14),transparent)]"
      />
      <Universe className="relative -mx-5 -mb-5 h-[300px] md:h-[340px]" />
      <ul className="pointer-events-none absolute bottom-4 left-5 right-5 flex flex-wrap gap-x-4 gap-y-1.5">
        {CLUSTERS.map((c) => (
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
