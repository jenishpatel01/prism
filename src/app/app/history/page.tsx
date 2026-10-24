import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "History" };

export default function Page() {
  return (
    <ComingSoon
      title="History"
      icon="history"
      description="Every analysis of this repository, and how it changed."
      planned={[
        "Health score over time, per commit",
        "Issues introduced and resolved between runs",
        "Compare any two analyses side by side",
        "Alerts when a pull request makes things worse"
      ]}
    />
  );
}
