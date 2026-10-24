import { Suspense } from "react";
import type { Metadata } from "next";
import { SidebarFallback } from "@/components/app/Sidebar";
import SidebarServer from "@/components/app/SidebarServer";

export const metadata: Metadata = {
  title: { default: "Overview", template: "%s · PRISM" },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-svh">
      {/* The sidebar reads the URL and the signed-in user, both only known at request time. */}
      <Suspense fallback={<SidebarFallback />}>
        <SidebarServer />
      </Suspense>
      <main className="lg:pl-[256px]">
        <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 md:px-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
