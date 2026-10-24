import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Quality" };

export default function Page() {
  return (
    <ComingSoon
      title="Quality"
      icon="quality"
      description="Maintainability, complexity, coverage and duplication over time."
      planned={[
        "Complexity per function and module, with history",
        "Test coverage gaps on the riskiest code",
        "Duplicate code clusters",
        "Trends compared with previous analyses"
      ]}
    />
  );
}
