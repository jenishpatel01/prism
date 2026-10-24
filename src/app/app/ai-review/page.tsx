import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "AI Review" };

export default function Page() {
  return (
    <ComingSoon
      title="AI Review"
      icon="ai"
      description="Claude explains what the analysis found, with every claim linked to evidence."
      planned={[
        "A prioritized review of the whole repository",
        "Plain-language explanations of each finding",
        "Links from every statement to the facts behind it",
        "Questions you can ask about any module"
      ]}
    />
  );
}
