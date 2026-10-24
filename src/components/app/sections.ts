import type { Category } from "@/lib/analysisTypes";
import type { IconName } from "./Icon";

/** App sections after Overview. Sections with a `category` list that category's issues. */
export const SECTIONS: Record<string, { title: string; icon: IconName; description: string; category?: Category; planned: string[] }> = {
  repository: {
    title: "Repository",
    icon: "repository",
    description: "The whole codebase in 3D. Click any file to fly to it and inspect it.",
    planned: [],
  },
  architecture: {
    title: "Architecture",
    icon: "architecture",
    description: "Layers, dependencies and risky modules, from the import graph.",
    planned: [],
  },
  security: {
    title: "Security",
    icon: "security",
    description: "Every security finding, with where it is and what depends on it.",
    category: "security",
    planned: [
      "Checks: SQL and shell commands built from strings, eval and new Function, XSS sinks, unsafe deserialization, committed secrets and .env files, and dependencies with known vulnerabilities (OSV.dev).",
    ],
  },
  performance: {
    title: "Performance",
    icon: "performance",
    description: "Patterns that slow requests down: N+1 queries, blocking calls and more.",
    category: "performance",
    planned: ["Checks: awaited database or network calls inside loops (N+1), and blocking synchronous file and process calls inside functions."],
  },
  quality: {
    title: "Quality",
    icon: "quality",
    description: "Complexity, size, duplication and circular dependencies.",
    category: "maintainability",
    planned: ["Checks: functions with cyclomatic complexity of 15 or more, files over 800 lines, and circular imports. Tests, examples and docs are excluded."],
  },
  "ai-review": {
    title: "AI Review",
    icon: "ai",
    description: "AI explains what the analysis found, with every claim linked to evidence.",
    planned: [],
  },
  history: {
    title: "History",
    icon: "history",
    description: "Every analysis of this repository, and how it changed.",
    planned: [],
  },
};

export const SECTION_KEYS = Object.keys(SECTIONS);
