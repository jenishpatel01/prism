import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Architecture" };

export default function Page() {
  return (
    <ComingSoon
      title="Architecture"
      icon="architecture"
      description="How your system is actually structured, layer by layer."
      planned={[
        "Layered module map generated from the import graph",
        "Circular dependencies and layer violations",
        "Module size by importance, emphasis by risk",
        "Drift between intended and actual architecture"
      ]}
    />
  );
}
