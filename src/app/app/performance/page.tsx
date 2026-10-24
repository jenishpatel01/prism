import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Performance" };

export default function Page() {
  return (
    <ComingSoon
      title="Performance"
      icon="performance"
      description="Where your requests spend their time, and the faster path."
      planned={[
        "Request pipelines with bottlenecks highlighted",
        "N+1 queries, blocking calls and heavy renders",
        "Before and after estimates for each fix",
        "p50 and p95 trends per endpoint"
      ]}
    />
  );
}
