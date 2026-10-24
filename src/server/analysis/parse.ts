import ts from "typescript";
import type { Category, Severity } from "@/lib/analysisTypes";

/*
 * Turns one source file into facts: functions with cyclomatic complexity,
 * classes, imports, and findings from pattern rules. JS/TS files are parsed
 * with the TypeScript compiler (a real AST); Python uses a line-based parser.
 */

export type FunctionFact = { name: string; line: number; complexity: number; length: number };

export type Finding = {
  rule: string;
  severity: Severity;
  category: Category;
  title: string;
  line: number;
  source: string;
  impact: string;
  detail?: string;
};

export type FileFacts = {
  path: string;
  language: string;
  lines: number;
  functions: FunctionFact[];
  classes: number;
  imports: string[];
  findings: Finding[];
  isTest: boolean;
};

const JS_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const TEST_FILE = /(^|\/)(__tests__|tests?|spec)(\/)|\.(test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|_test\.py$/i;

export function isCodeFile(path: string) {
  return JS_EXT.test(path) || path.endsWith(".py");
}

export function parseFile(path: string, text: string): FileFacts {
  const lines = text.split("\n").length;
  const isTest = TEST_FILE.test(path);
  if (JS_EXT.test(path)) return { ...parseJs(path, text), lines, isTest };
  if (path.endsWith(".py")) return { ...parsePython(path, text), lines, isTest };
  return { path, language: "Other", lines, functions: [], classes: 0, imports: [], findings: [], isTest };
}

/* ---------------- JavaScript / TypeScript ---------------- */

const SQL_WORDS = /\b(select|insert\s+into|update\s+\w+\s+set|delete\s+from)\b/i;
const QUERY_CALLS = /^(query|execute|exec|raw|\$queryRawUnsafe|\$executeRawUnsafe|unsafe|sql)$/;
const DB_CALLS = /^(query|execute|find|findOne|findMany|findUnique|findFirst|get|fetch|select|insert|update|save|count|aggregate)$/;
const SYNC_IO = /^(readFileSync|writeFileSync|existsSync|readdirSync|statSync|execSync|appendFileSync)$/;

function calleeName(expr: ts.Expression): string {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return "";
}

function hasInterpolation(node: ts.Node | undefined): boolean {
  if (!node) return false;
  if (ts.isTemplateExpression(node)) return node.templateSpans.length > 0;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    // String concatenation that mixes literal text with variables.
    let hasString = false;
    let hasVar = false;
    const walk = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) hasString = true;
      else if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n) || ts.isCallExpression(n)) {
        hasVar = true;
        return;
      }
      ts.forEachChild(n, walk);
    };
    walk(node);
    return hasString && hasVar;
  }
  return false;
}

function looksLikeSql(node: ts.Node): boolean {
  return SQL_WORDS.test(node.getText());
}

function parseJs(path: string, text: string) {
  const kind = /\.tsx$/i.test(path) ? ts.ScriptKind.TSX : /\.jsx$/i.test(path) ? ts.ScriptKind.JSX : /\.ts$/i.test(path) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const functions: FunctionFact[] = [];
  const imports: string[] = [];
  const findings: Finding[] = [];
  let classes = 0;

  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const fnName = (n: ts.Node): string => {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n.name.getText(sf);
    if (ts.isConstructorDeclaration(n)) return "constructor";
    const p = n.parent;
    if (p && ts.isVariableDeclaration(p)) return p.name.getText(sf);
    if (p && ts.isPropertyAssignment(p)) return p.name.getText(sf);
    if (p && ts.isPropertyDeclaration(p)) return p.name.getText(sf);
    return "anonymous";
  };

  const isFunction = (n: ts.Node) =>
    ts.isFunctionDeclaration(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isArrowFunction(n) ||
    ts.isFunctionExpression(n) ||
    ts.isConstructorDeclaration(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isSetAccessorDeclaration(n);

  // Complexity of one function body, not counting nested functions.
  const complexityOf = (fn: ts.Node) => {
    let c = 1;
    const walk = (n: ts.Node) => {
      if (n !== fn && isFunction(n)) return;
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          c++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const op = (n as ts.BinaryExpression).operatorToken.kind;
          if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) c++;
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(fn);
    return c;
  };

  const insideLoop = (n: ts.Node) => {
    for (let p = n.parent; p; p = p.parent) {
      if (isFunction(p)) return false;
      if (ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) return true;
    }
    return false;
  };

  const add = (f: Omit<Finding, "line">, n: ts.Node) => findings.push({ ...f, line: lineOf(n) });

  const visit = (n: ts.Node) => {
    if (isFunction(n)) {
      const start = lineOf(n);
      const end = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
      functions.push({ name: fnName(n), line: start, complexity: complexityOf(n), length: end - start + 1 });
    }
    if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) classes++;

    // Imports and re-exports.
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      imports.push(n.moduleSpecifier.text);
    }

    if (ts.isCallExpression(n)) {
      const name = calleeName(n.expression);
      const arg0 = n.arguments[0];

      // require("x") and import("x")
      if ((name === "require" || n.expression.kind === ts.SyntaxKind.ImportKeyword) && arg0 && ts.isStringLiteral(arg0)) {
        imports.push(arg0.text);
      }

      // SQL built from user-controlled strings.
      if (QUERY_CALLS.test(name) && arg0 && hasInterpolation(arg0) && looksLikeSql(arg0)) {
        add(
          {
            rule: "sql-injection",
            severity: "critical",
            category: "security",
            title: `Possible SQL injection in ${name}()`,
            source: "AST · string-built query",
            impact: "Query built from interpolated values",
            detail: "The query text is assembled with template or string concatenation. Use parameters or a query builder instead.",
          },
          n,
        );
      }

      // Shell commands built from strings.
      if (/^(exec|execSync|spawn|spawnSync)$/.test(name) && arg0 && hasInterpolation(arg0)) {
        add(
          {
            rule: "command-injection",
            severity: "critical",
            category: "security",
            title: `Shell command built from variables in ${name}()`,
            source: "AST · child_process",
            impact: "Possible command injection",
          },
          n,
        );
      }

      if (name === "eval" && ts.isIdentifier(n.expression)) {
        add({ rule: "eval", severity: "high", category: "security", title: "Use of eval()", source: "AST", impact: "Runs arbitrary code" }, n);
      }

      // Awaited database / network calls inside loops: the N+1 pattern.
      if (DB_CALLS.test(name) && n.parent && ts.isAwaitExpression(n.parent) && insideLoop(n)) {
        add(
          {
            rule: "await-in-loop",
            severity: "high",
            category: "performance",
            title: `Awaited ${name}() inside a loop`,
            source: "AST · N+1 pattern",
            impact: "One round-trip per iteration",
            detail: "Each loop iteration waits for its own request. Batch the work or use Promise.all.",
          },
          n,
        );
      }

      if (SYNC_IO.test(name)) {
        const inFunction = (() => {
          for (let p = n.parent; p; p = p.parent) if (isFunction(p)) return true;
          return false;
        })();
        if (inFunction) {
          add(
            { rule: "sync-io", severity: "medium", category: "performance", title: `Blocking ${name}() call`, source: "AST", impact: "Blocks the event loop" },
            n,
          );
        }
      }
    }

    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "Function") {
      add({ rule: "new-function", severity: "high", category: "security", title: "Code built with new Function()", source: "AST", impact: "Runs arbitrary code" }, n);
    }

    // innerHTML = ... and dangerouslySetInnerHTML
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && /^(innerHTML|outerHTML)$/.test(n.left.name.text)) {
      add({ rule: "inner-html", severity: "medium", category: "security", title: `Direct ${n.left.name.text} assignment`, source: "AST · XSS", impact: "Possible cross-site scripting" }, n);
    }
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === "dangerouslySetInnerHTML") {
      add({ rule: "dangerous-html", severity: "medium", category: "security", title: "dangerouslySetInnerHTML in JSX", source: "AST · XSS", impact: "Possible cross-site scripting" }, n);
    }

    ts.forEachChild(n, visit);
  };
  visit(sf);

  return { path, language: /\.tsx?$/i.test(path) ? "TypeScript" : "JavaScript", functions, classes, imports, findings };
}

/* ---------------- Python (line-based) ---------------- */

function parsePython(path: string, text: string) {
  const src = text.split("\n");
  const functions: FunctionFact[] = [];
  const imports: string[] = [];
  const findings: Finding[] = [];
  let classes = 0;

  type Open = { name: string; line: number; indent: number; complexity: number };
  const stack: Open[] = [];
  const close = (upto: number, indent: number) => {
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      const f = stack.pop()!;
      functions.push({ name: f.name, line: f.line, complexity: f.complexity, length: upto - f.line + 1 });
    }
  };

  let loopIndent = -1;
  src.forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "");
    if (!line.trim()) return;
    const indent = line.length - line.trimStart().length;
    const t = line.trim();
    const n = i + 1;

    // A line at or left of a function's own indent ends that function.
    close(n - 1, indent);
    if (loopIndent >= indent && !/^(for|while)\b/.test(t)) loopIndent = -1;

    let m: RegExpMatchArray | null;
    if ((m = t.match(/^(?:async\s+)?def\s+(\w+)/))) stack.push({ name: m[1], line: n, indent, complexity: 1 });
    if (/^class\s+\w+/.test(t)) classes++;
    if ((m = t.match(/^import\s+([\w.]+)/))) imports.push(m[1]);
    if ((m = t.match(/^from\s+([.\w]+)\s+import/))) imports.push(m[1]);

    const branches = (t.match(/^(if|elif|for|while|except|case)\b|\band\b|\bor\b|\bif\b.*\belse\b/g) || []).length;
    if (stack.length) stack[stack.length - 1].complexity += branches;
    if (/^(for|while)\b/.test(t)) loopIndent = indent;

    if (/\.(execute|executemany|raw)\(\s*f["']/.test(t) || /\.(execute|raw)\(\s*["'].*["']\s*(%|\.format\()/.test(t)) {
      findings.push({ rule: "sql-injection", severity: "critical", category: "security", title: "Possible SQL injection in execute()", line: n, source: "Pattern · string-built query", impact: "Query built from formatted strings" });
    }
    if (/subprocess\.\w+\(.*shell\s*=\s*True/.test(t) || /os\.system\(/.test(t)) {
      findings.push({ rule: "command-injection", severity: "high", category: "security", title: "Shell command execution", line: n, source: "Pattern", impact: "Possible command injection" });
    }
    if (/(^|[^.\w])(eval|exec)\(/.test(t)) {
      findings.push({ rule: "eval", severity: "high", category: "security", title: "Use of eval()/exec()", line: n, source: "Pattern", impact: "Runs arbitrary code" });
    }
    if (/pickle\.loads?\(/.test(t)) {
      findings.push({ rule: "pickle", severity: "medium", category: "security", title: "Unpickling data", line: n, source: "Pattern", impact: "Unsafe with untrusted input" });
    }
    if (/yaml\.load\((?!.*Loader)/.test(t)) {
      findings.push({ rule: "yaml-load", severity: "medium", category: "security", title: "yaml.load() without a safe loader", line: n, source: "Pattern", impact: "Can construct arbitrary objects" });
    }
    if (loopIndent >= 0 && indent > loopIndent && /\b(\.execute|\.query|\.get|\.filter|requests\.\w+|\.objects\.\w+)\(/.test(t) && /await |requests\.|\.execute|\.objects/.test(t)) {
      findings.push({ rule: "query-in-loop", severity: "high", category: "performance", title: "Query or request inside a loop", line: n, source: "Pattern · N+1", impact: "One round-trip per iteration" });
    }
  });
  close(src.length, -Infinity);

  return { path, language: "Python", functions, classes, imports, findings };
}
