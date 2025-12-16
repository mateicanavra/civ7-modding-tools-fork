import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { Value } from "typebox/value";

import { MapGenConfigSchema } from "../src/config/schema.ts";

type Primitive = string | number | boolean | null;

type Finding = {
  file: string;
  line: number;
  column: number;
  op: "??" | "||";
  configPath: string[];
  codeDefault: Primitive;
  schemaDefault: unknown;
};

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC_ROOT = path.join(REPO_ROOT, "src");

function normalizePath(p: string): string {
  return p.split(path.sep).join("/");
}

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "dist" || ent.name === "node_modules") continue;
      out.push(...(await listSourceFiles(full)));
      continue;
    }
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith(".ts")) continue;
    if (ent.name.endsWith(".d.ts")) continue;
    out.push(full);
  }
  return out;
}

function unwrapExpression(expr: ts.Expression): ts.Expression {
  let cur = expr;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (ts.isParenthesizedExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isAsExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isNonNullExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isTypeAssertionExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return cur;
}

function evalNumericConst(expr: ts.Expression): number | null {
  const node = unwrapExpression(expr);
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node)) {
    const v = evalNumericConst(node.operand);
    if (v === null) return null;
    if (node.operator === ts.SyntaxKind.PlusToken) return v;
    if (node.operator === ts.SyntaxKind.MinusToken) return -v;
    return null;
  }
  if (ts.isBinaryExpression(node)) {
    const left = evalNumericConst(node.left);
    const right = evalNumericConst(node.right);
    if (left === null || right === null) return null;
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        return left + right;
      case ts.SyntaxKind.MinusToken:
        return left - right;
      case ts.SyntaxKind.AsteriskToken:
        return left * right;
      case ts.SyntaxKind.SlashToken:
        return left / right;
      default:
        return null;
    }
  }
  return null;
}

function evalPrimitive(expr: ts.Expression): Primitive | null {
  const node = unwrapExpression(expr);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isStringLiteral(node)) return node.text;

  const num = evalNumericConst(node);
  if (num !== null) return num;
  return null;
}

type Chain = { base: ts.Expression; props: string[] };

function getPropertyChain(expr: ts.Expression): Chain | null {
  const node = unwrapExpression(expr);
  if (ts.isPropertyAccessExpression(node) || ts.isPropertyAccessChain(node)) {
    const inner = getPropertyChain(node.expression);
    if (!inner) return null;
    return { base: inner.base, props: [...inner.props, node.name.text] };
  }
  if (ts.isIdentifier(node)) return { base: node, props: [] };
  if (ts.isThis(node)) return { base: node, props: [] };
  return null;
}

function getLineCol(sf: ts.SourceFile, node: ts.Node): { line: number; column: number } {
  const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf, false));
  return { line: pos.line + 1, column: pos.character + 1 };
}

function getAtPath(obj: unknown, pathParts: string[]): unknown {
  let cur: unknown = obj;
  for (const part of pathParts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function hasUndefinedPrefix(obj: unknown, pathParts: string[]): boolean {
  for (let i = 1; i < pathParts.length; i++) {
    const prefix = getAtPath(obj, pathParts.slice(0, i));
    if (prefix === undefined) return true;
  }
  return false;
}

function resolveConfigPath(chain: Chain, scope: Map<string, string[]>): string[] | null {
  const baseNode = unwrapExpression(chain.base);

  let baseName: string | null = null;
  if (ts.isIdentifier(baseNode)) baseName = baseNode.text;
  if (ts.isThis(baseNode)) baseName = "this";
  if (!baseName) return null;

  if ((baseName === "ctx" || baseName === "context") && chain.props[0] === "config") {
    return chain.props.slice(1);
  }

  if (baseName === "this" && chain.props[0] === "mapGenConfig") {
    return chain.props.slice(1);
  }

  const basePath = scope.get(baseName);
  if (!basePath) return null;
  return [...basePath, ...chain.props];
}

function tryInferConfigPathFromInitializer(init: ts.Expression, scope: Map<string, string[]>): string[] | null {
  const node = unwrapExpression(init);
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      const right = unwrapExpression(node.right);
      if (ts.isObjectLiteralExpression(right)) {
        return tryInferConfigPathFromInitializer(node.left, scope);
      }
    }
  }

  const chain = getPropertyChain(node);
  if (!chain) return null;
  return resolveConfigPath(chain, scope);
}

function walk(sf: ts.SourceFile, schemaDefaults: unknown, findings: Finding[]): void {
  const scopeStack: Array<Map<string, string[]>> = [new Map()];

  const knownParamBases: Record<string, string[]> = {
    corridorsCfg: ["corridors"],
    landmassCfg: ["landmass"],
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) {
      const childScope = new Map(scopeStack[scopeStack.length - 1]);
      for (const param of node.parameters) {
        if (ts.isIdentifier(param.name)) {
          const inferred = knownParamBases[param.name.text];
          if (inferred) childScope.set(param.name.text, inferred);
        }
      }
      scopeStack.push(childScope);
      ts.forEachChild(node, visit);
      scopeStack.pop();
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const scope = scopeStack[scopeStack.length - 1];
      const inferred = tryInferConfigPathFromInitializer(node.initializer, scope);
      if (inferred) scope.set(node.name.text, inferred);
    }

    if (ts.isBinaryExpression(node)) {
      const opKind = node.operatorToken.kind;
      const op: "??" | "||" | null =
        opKind === ts.SyntaxKind.QuestionQuestionToken
          ? "??"
          : opKind === ts.SyntaxKind.BarBarToken
            ? "||"
            : null;

      if (op) {
        const codeDefault = evalPrimitive(node.right);
        if (codeDefault !== null) {
          const chain = getPropertyChain(node.left);
          if (chain) {
            const scope = scopeStack[scopeStack.length - 1];
            const configPath = resolveConfigPath(chain, scope);
            if (configPath) {
              const schemaDefault = getAtPath(schemaDefaults, configPath);
              if (schemaDefault === undefined && hasUndefinedPrefix(schemaDefaults, configPath)) {
                ts.forEachChild(node, visit);
                return;
              }

              if (schemaDefault !== codeDefault) {
                const { line, column } = getLineCol(sf, node.operatorToken);
                findings.push({
                  file: sf.fileName,
                  line,
                  column,
                  op,
                  configPath,
                  codeDefault,
                  schemaDefault,
                });
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sf, visit);
}

async function main(): Promise<void> {
  const files = await listSourceFiles(SRC_ROOT);

  const defaulted = Value.Default(MapGenConfigSchema, {});
  const converted = Value.Convert(MapGenConfigSchema, defaulted);
  const cleaned = Value.Clean(MapGenConfigSchema, converted);

  const findings: Finding[] = [];

  for (const file of files) {
    const rel = normalizePath(path.relative(REPO_ROOT, file));
    if (rel.startsWith("src/config/")) continue;
    const text = await readFile(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
    walk(sf, cleaned, findings);
  }

  if (findings.length === 0) {
    console.log("[check-schema-defaults] OK: no schema/default drift detected.");
    return;
  }

  console.error("[check-schema-defaults] Schema/default drift detected:\n");
  for (const f of findings) {
    const rel = normalizePath(path.relative(REPO_ROOT, f.file));
    console.error(
      `- ${rel}:${f.line}:${f.column} ${f.op} default for ${f.configPath.join(".")}: ` +
        `code=${String(f.codeDefault)} schema=${String(f.schemaDefault)}`
    );
  }
  process.exitCode = 1;
}

await main();
