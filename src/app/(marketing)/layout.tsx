import SmoothScroll from "@/components/dom/SmoothScroll";

/** Landing page only: Lenis smooth scroll drives the cinematic scroll scenes. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      {children}
    </>
  );
}
