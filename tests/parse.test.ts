import { describe, expect, it } from "vitest";
import { parseFile } from "@/server/analysis/parse";

const rules = (path: string, text: string) => parseFile(path, text).findings.map((f) => f.rule);

describe("JavaScript and TypeScript rules", () => {
  it("flags SQL built from a template string, but not a parameterised query", () => {
    expect(rules("a.ts", "db.query(`SELECT * FROM users WHERE id = ${id}`)")).toContain("sql-injection");
    expect(rules("a.ts", "db.query('SELECT * FROM users WHERE id = $1', [id])")).not.toContain("sql-injection");
    expect(rules("a.ts", "db.query(`SELECT * FROM users`)")).not.toContain("sql-injection");
  });

  it("flags shell commands built from variables, but not constant ones", () => {
    expect(rules("a.js", "exec(`rm -rf ${dir}`)")).toContain("command-injection");
    expect(rules("a.js", "exec('ls -la')")).not.toContain("command-injection");
  });

  it("flags eval() and new Function(), but not the word eval in a string", () => {
    expect(rules("a.js", "eval(code)")).toContain("eval");
    expect(rules("a.js", "const s = 'do not eval(this)'")).not.toContain("eval");
    expect(rules("a.js", "new Function('a', 'return a')")).toContain("new-function");
  });

  it("flags awaited queries in a loop (N+1), but not outside a loop or in a nested function", () => {
    expect(rules("a.ts", "async function f(ids){ for (const id of ids) { await db.findOne(id) } }")).toContain("await-in-loop");
    expect(rules("a.ts", "async function f(id){ await db.findOne(id) }")).not.toContain("await-in-loop");
    expect(rules("a.ts", "async function f(ids){ for (const id of ids) { ids.map(async () => { await db.findOne(id) }) } }")).not.toContain("await-in-loop");
  });

  it("flags blocking sync calls inside functions only", () => {
    expect(rules("a.js", "function f(){ return readFileSync('x') }")).toContain("sync-io");
    expect(rules("a.js", "const config = readFileSync('x')")).not.toContain("sync-io");
  });

  it("flags innerHTML assignment and dangerouslySetInnerHTML", () => {
    expect(rules("a.js", "el.innerHTML = html")).toContain("inner-html");
    expect(rules("a.tsx", "const A = () => <div dangerouslySetInnerHTML={{ __html: h }} />")).toContain("dangerous-html");
    expect(rules("a.js", "el.textContent = text")).toEqual([]);
  });

  it("measures cyclomatic complexity", () => {
    const facts = parseFile("a.ts", "function f(a,b){ if (a && b) { return 1 } else if (a || b) { return 2 } for (const x of a) {} return a ? 1 : 2 }");
    // 1 + if + && + if + || + for + ?:  = 7
    expect(facts.functions[0].complexity).toBe(7);
  });

  it("collects imports and requires", () => {
    const facts = parseFile("a.ts", "import x from './x'; export * from './y'; const z = require('./z'); import('./w')");
    expect(facts.imports.sort()).toEqual(["./w", "./x", "./y", "./z"]);
  });

  it("marks test files", () => {
    expect(parseFile("src/a.test.ts", "").isTest).toBe(true);
    expect(parseFile("tests/a.ts", "").isTest).toBe(true);
    expect(parseFile("src/a.ts", "").isTest).toBe(false);
  });
});

describe("Python rules", () => {
  it("flags string-built SQL, shell execution, eval, pickle and unsafe yaml", () => {
    expect(rules("a.py", 'cur.execute(f"select * from t where id = {i}")')).toContain("sql-injection");
    expect(rules("a.py", 'cur.execute("select * from t where id = %s", (i,))')).not.toContain("sql-injection");
    expect(rules("a.py", "subprocess.run(cmd, shell=True)")).toContain("command-injection");
    expect(rules("a.py", "eval(x)")).toContain("eval");
    expect(rules("a.py", "data = pickle.loads(b)")).toContain("pickle");
    expect(rules("a.py", "yaml.load(f)")).toContain("yaml-load");
    expect(rules("a.py", "yaml.load(f, Loader=SafeLoader)")).not.toContain("yaml-load");
  });

  it("finds functions and their complexity", () => {
    const facts = parseFile("a.py", "def f(a):\n    if a and a > 1:\n        return 1\n    return 2\n");
    expect(facts.functions).toHaveLength(1);
    expect(facts.functions[0].name).toBe("f");
    expect(facts.functions[0].complexity).toBeGreaterThanOrEqual(3);
  });
});
