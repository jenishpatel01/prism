import { describe, expect, it } from "vitest";
import { mask, scanSecrets } from "@/server/analysis/secrets";

const file = (path: string, text: string) => ({ path, text, bytes: text.length });

describe("scanSecrets", () => {
  // AWS's documented example key: obviously not real, and matches the real format.
  const AWS = "AKIAIOSFODNN7EXAMPLE";

  it("finds an AWS key and never returns the value", () => {
    const out = scanSecrets([file("src/config.ts", `const key = "${AWS}";`)]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ rule: "secret", severity: "critical", line: 1, path: "src/config.ts" });
    expect(JSON.stringify(out)).not.toContain(AWS);
    expect(out[0].impact).toContain("AKIA••••");
  });

  it("finds a private key header", () => {
    const out = scanSecrets([file("deploy/key.ts", "-----BEGIN RSA PRIVATE KEY-----\n")]);
    expect(out[0]).toMatchObject({ rule: "secret", severity: "critical" });
  });

  it("finds a hardcoded password, ignores placeholders and environment lookups", () => {
    expect(scanSecrets([file("a.ts", 'const password = "s3cretValue99";')])).toHaveLength(1);
    expect(scanSecrets([file("a.ts", 'const password = "changeme-please";')])).toHaveLength(0);
    expect(scanSecrets([file("a.ts", 'const password = process.env.PASSWORD || "abcdefghijkl";')])).toHaveLength(0);
  });

  it("flags a committed .env file but not .env.example", () => {
    expect(scanSecrets([file(".env", "A=1")]).map((f) => f.rule)).toEqual(["env-file"]);
    expect(scanSecrets([file(".env.example", "A=")])).toHaveLength(0);
  });

  it("skips tests, docs and lockfiles", () => {
    expect(scanSecrets([file("tests/a.ts", `x = "${AWS}"`), file("docs/a.ts", `x = "${AWS}"`), file("README.md", AWS)])).toHaveLength(0);
  });

  it("gives every secret a subject, so fingerprints don't depend on the value", () => {
    const [a] = scanSecrets([file("src/c.ts", `x = "${AWS}"`)]);
    expect(a.subject).toBe("AWS access key");
  });

  it("masks values", () => {
    expect(mask("abcdefghijkl")).toBe("abcd••••");
    expect(mask("abc")).toBe("••••");
  });
});
