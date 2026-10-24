import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Security" };

export default function Page() {
  return (
    <ComingSoon
      title="Security"
      icon="security"
      description="Every vulnerability, traced through the code that depends on it."
      planned={[
        "All findings from taint analysis, secret scans and dependency audits",
        "Propagation view: which modules inherit each risk",
        "Risk scores with the evidence behind them",
        "Suggested fixes, ready to open as pull requests"
      ]}
    />
  );
}
