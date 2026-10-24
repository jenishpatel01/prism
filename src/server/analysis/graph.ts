import type { FileFacts } from "./parse";

/*
 * Builds the internal dependency graph: which project files import which.
 * External packages are ignored here (they're covered by the dependency audit).
 */

const JS_TRY = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

function normalize(path: string) {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

export function buildGraph(files: FileFacts[]) {
  const index = new Map(files.map((f, i) => [f.path, i]));
  const hasSrc = files.some((f) => f.path.startsWith("src/"));
  const edges = new Set<string>();
  const links: [number, number][] = [];

  const resolveJs = (from: string, spec: string): number | undefined => {
    let base: string | null = null;
    if (spec.startsWith(".")) base = normalize(from.split("/").slice(0, -1).join("/") + "/" + spec);
    else if (spec.startsWith("@/") || spec.startsWith("~/")) base = (hasSrc ? "src/" : "") + spec.slice(2);
    else if (spec.startsWith("/")) base = spec.slice(1);
    if (base === null) return undefined;
    // TypeScript projects often import "./x.js" for a file that is really x.ts.
    const candidates = [base, base.replace(/\.js$/, "")];
    for (const c of candidates) for (const ext of JS_TRY) {
      const hit = index.get(c + ext);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };

  const resolvePy = (from: string, spec: string): number | undefined => {
    let path: string;
    if (spec.startsWith(".")) {
      const dots = spec.match(/^\.+/)![0].length;
      const dir = from.split("/").slice(0, -dots);
      path = [...dir, ...spec.slice(dots).split(".").filter(Boolean)].join("/");
    } else {
      path = spec.split(".").join("/");
    }
    for (const c of [path + ".py", path + "/__init__.py"]) {
      const hit = index.get(c);
      if (hit !== undefined) return hit;
      // Packages often live under src/ or a top-level folder.
      for (const [p, i] of index) if (p.endsWith("/" + c)) return i;
    }
    return undefined;
  };

  files.forEach((f, i) => {
    for (const spec of f.imports) {
      const j = f.language === "Python" ? resolvePy(f.path, spec) : resolveJs(f.path, spec);
      if (j === undefined || j === i) continue;
      const key = `${i}>${j}`;
      if (edges.has(key)) continue;
      edges.add(key);
      links.push([i, j]);
    }
  });

  const fanIn = new Array(files.length).fill(0);
  const adj: number[][] = files.map(() => []);
  for (const [a, b] of links) {
    fanIn[b]++;
    adj[a].push(b);
  }

  return { links, fanIn, cycles: findCycles(adj) };
}

/** Tarjan's strongly connected components; groups of 2+ files import each other in a loop. */
function findCycles(adj: number[][]): number[][] {
  let idx = 0;
  const indexOf = new Array(adj.length).fill(-1);
  const low = new Array(adj.length).fill(0);
  const onStack = new Array(adj.length).fill(false);
  const stack: number[] = [];
  const result: number[][] = [];

  // Iterative version so large repos can't overflow the call stack.
  for (let s = 0; s < adj.length; s++) {
    if (indexOf[s] !== -1) continue;
    const work: [number, number][] = [[s, 0]];
    while (work.length) {
      const top = work[work.length - 1];
      const [v, ei] = top;
      if (ei === 0 && indexOf[v] === -1) {
        indexOf[v] = low[v] = idx++;
        stack.push(v);
        onStack[v] = true;
      }
      if (ei < adj[v].length) {
        top[1]++;
        const w = adj[v][ei];
        if (indexOf[w] === -1) work.push([w, 0]);
        else if (onStack[w]) low[v] = Math.min(low[v], indexOf[w]);
      } else {
        work.pop();
        if (work.length) {
          const parent = work[work.length - 1][0];
          low[parent] = Math.min(low[parent], low[v]);
        }
        if (low[v] === indexOf[v]) {
          const comp: number[] = [];
          let w: number;
          do {
            w = stack.pop()!;
            onStack[w] = false;
            comp.push(w);
          } while (w !== v);
          if (comp.length > 1) result.push(comp);
        }
      }
    }
  }
  return result;
}
