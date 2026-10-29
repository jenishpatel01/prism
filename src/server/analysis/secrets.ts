import type { SourceFile } from "./fetchRepo";
import type { Finding } from "./parse";

/*
 * Looks for credentials committed to the repo. Matches are always masked:
 * PRISM reports where a secret is, never the secret itself.
 */

const RULES: { name: string; re: RegExp; severity: Finding["severity"] }[] = [
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/, severity: "critical" },
  { name: "GitHub token", re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/, severity: "critical" },
  { name: "Stripe live key", re: /\b(sk|rk)_live_[0-9a-zA-Z]{20,}\b/, severity: "critical" },
  { name: "Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/, severity: "high" },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/, severity: "high" },
  { name: "Private key", re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, severity: "critical" },
  {
    name: "Hardcoded credential",
    re: /\b(password|passwd|secret|api_?key|access_?token|auth_?token|client_?secret)\b\s*[:=]\s*["']([^"'\s$\{]{10,})["']/i,
    severity: "high",
  },
];

const PLACEHOLDER = /(example|sample|dummy|changeme|placeholder|your[_-]|xxx|<|test|fake|\*\*\*)/i;
const SKIP = /(\.lock$|lock\.json$|\.md$|(^|\/)(test|tests|__tests__|fixtures?|examples?|docs?)\/)/i;

export function mask(value: string) {
  return value.length <= 6 ? "••••" : `${value.slice(0, 4)}••••`;
}

export function scanSecrets(files: SourceFile[]): (Finding & { path: string })[] {
  const out: (Finding & { path: string })[] = [];

  for (const f of files) {
    // A committed .env file is a finding by itself.
    if (/(^|\/)\.env(\.[\w-]+)?$/.test(f.path) && !/\.(example|sample|template|dist)$/.test(f.path)) {
      out.push({
        path: f.path,
        rule: "env-file",
        severity: "high",
        category: "security",
        title: "Environment file committed to the repository",
        subject: "",
        line: 1,
        source: "Secret scan",
        impact: "May expose credentials",
      });
    }
    if (SKIP.test(f.path)) continue;

    const lines = f.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 500) continue;
      for (const r of RULES) {
        const m = line.match(r.re);
        if (!m) continue;
        const value = m[2] ?? m[0];
        if (r.name === "Hardcoded credential" && (PLACEHOLDER.test(value) || /process\.env|os\.environ|getenv/.test(line))) continue;
        out.push({
          path: f.path,
          rule: "secret",
          severity: r.severity,
          category: "security",
          title: `${r.name} in source`,
          subject: r.name,
          line: i + 1,
          source: "Secret scan",
          impact: `Value starts ${mask(value)}`,
        });
        break;
      }
    }
  }
  return out;
}
