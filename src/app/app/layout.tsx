import type { Metadata } from "next";
import Sidebar from "@/components/app/Sidebar";

export const metadata: Metadata = {
  title: { default: "Overview", template: "%s · PRISM" },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-svh">
      <Sidebar />
      <main className="lg:pl-[256px]">
        <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 md:px-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
