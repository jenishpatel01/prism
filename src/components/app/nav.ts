import type { IconName } from "./Icon";

export const NAV: { href: string; label: string; icon: IconName; key: string }[] = [
  { href: "/app", label: "Overview", icon: "overview", key: "overview" },
  { href: "/app/repository", label: "Repository", icon: "repository", key: "repository" },
  { href: "/app/architecture", label: "Architecture", icon: "architecture", key: "architecture" },
  { href: "/app/security", label: "Security", icon: "security", key: "security" },
  { href: "/app/performance", label: "Performance", icon: "performance", key: "performance" },
  { href: "/app/quality", label: "Quality", icon: "quality", key: "quality" },
  { href: "/app/ai-review", label: "AI Review", icon: "ai", key: "ai-review" },
  { href: "/app/history", label: "History", icon: "history", key: "history" },
];
