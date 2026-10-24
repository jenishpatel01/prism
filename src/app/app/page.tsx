import OverviewView from "@/components/app/overview/OverviewView";
import { demoResult } from "@/lib/demoAnalysis";

export default function OverviewPage() {
  return <OverviewView data={demoResult} base="/app" />;
}
