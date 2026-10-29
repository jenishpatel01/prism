import { describe, expect, it } from "vitest";
import { buildGraph } from "@/server/analysis/graph";
import { parseFile } from "@/server/analysis/parse";

const facts = (files: Record<string, string>) => Object.entries(files).map(([p, t]) => parseFile(p, t));

describe("buildGraph", () => {
  it("finds a cycle of two files", () => {
    const g = buildGraph(facts({ "src/a.ts": "import './b'", "src/b.ts": "import './a'" }));
    expect(g.cycles).toHaveLength(1);
    expect(g.cycles[0].sort()).toEqual([0, 1]);
  });

  it("finds a cycle of three files and counts fan-in", () => {
    const g = buildGraph(facts({ "src/a.ts": "import './b'", "src/b.ts": "import './c'", "src/c.ts": "import './a'", "src/d.ts": "import './a'" }));
    expect(g.cycles).toHaveLength(1);
    expect(g.cycles[0]).toHaveLength(3);
    expect(g.fanIn).toEqual([2, 1, 1, 0]);
  });

  it("ignores self-imports, external packages and unresolved paths", () => {
    const g = buildGraph(facts({ "src/a.ts": "import './a'; import 'react'; import './missing'" }));
    expect(g.links).toEqual([]);
    expect(g.cycles).toEqual([]);
  });

  it("resolves the @/ alias and index files", () => {
    const g = buildGraph(facts({ "src/a.ts": "import '@/lib/x'", "src/lib/x/index.ts": "export {}" }));
    expect(g.links).toEqual([[0, 1]]);
  });
});
