import Icon, { type IconName } from "./Icon";
import { PageHeader, Panel, PanelLink } from "./ui";

/** Placeholder for app sections that are designed but not built yet. */
export default function ComingSoon({
  title,
  icon,
  description,
  planned,
}: {
  title: string;
  icon: IconName;
  description: string;
  planned: string[];
}) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <Panel>
        <div className="relative grid gap-10 overflow-hidden py-6 md:grid-cols-[220px_1fr] md:items-center md:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 top-1/2 size-72 -translate-y-1/2 bg-[radial-gradient(closest-side,rgb(91_140_255/0.22),transparent)]"
          />
          <div className="relative mx-auto grid size-40 place-items-center rounded-full border border-line">
            <span className="absolute inset-4 rounded-full border border-dashed border-line-strong spin" />
            <Icon name={icon} size={44} className="text-accent drop-shadow-[0_0_12px_rgb(91_140_255/0.7)]" />
          </div>
          <div className="relative">
            <p className="label text-accent">Coming next</p>
            <p className="mt-3 text-[20px] font-medium tracking-[-0.015em] text-white">This screen will show</p>
            <ul className="mt-4 space-y-2.5">
              {planned.map((p) => (
                <li key={p} className="flex gap-3 text-[14px] leading-relaxed text-fg-muted">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <PanelLink href="/app">Back to overview</PanelLink>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
