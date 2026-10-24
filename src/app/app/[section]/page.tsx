import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HistoryView from "@/components/app/HistoryView";
import SectionView from "@/components/app/SectionView";
import { SECTION_KEYS, SECTIONS } from "@/components/app/sections";
import { PageHeader, Panel } from "@/components/app/ui";
import { demoResult } from "@/lib/demoAnalysis";

export function generateStaticParams() {
  return SECTION_KEYS.map((section) => ({ section }));
}

export async function generateMetadata({ params }: PageProps<"/app/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: SECTIONS[section]?.title ?? "Not found" };
}

function Section({ section }: { section: string }) {
  if (!SECTIONS[section]) notFound();

  if (section === "history") {
    return (
      <div className="space-y-6">
        <PageHeader title="History" description="Every analysis you've run, newest first." repo={{ ...demoResult.repo, demo: true }} />
        <Suspense fallback={<Panel><p className="py-6 text-center text-[13px] text-fg-dim">Loading history…</p></Panel>}>
          <HistoryView />
        </Suspense>
      </div>
    );
  }
  return <SectionView section={section} data={demoResult} base="/app" />;
}

/** Demo workspace sections. History shows the signed-in user's real saved analyses. */
export default function Page({ params }: PageProps<"/app/[section]">) {
  return <Suspense fallback={null}>{params.then(({ section }) => <Section section={section} />)}</Suspense>;
}
