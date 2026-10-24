import type { Metadata } from "next";
import ComingSoon from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Repository" };

export default function Page() {
  return (
    <ComingSoon
      title="Repository"
      icon="repository"
      description="Explore the full 3D map of your codebase. Fly to any file or module to inspect it."
      planned={[
        "The interactive repository universe, full screen",
        "Click a node to fly the camera to that module",
        "Complexity, dependencies, issues and AI notes per file",
        "Filters by layer, language, owner and risk"
      ]}
    />
  );
}
