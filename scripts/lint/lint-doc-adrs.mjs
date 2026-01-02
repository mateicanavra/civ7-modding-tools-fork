#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SEARCH_ROOTS = ["docs/projects"];

const DEFAULT_EXCLUDE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
  "out",
  "mod",
  "civ7-official-resources",
]);

const ADR_HEADING_RE = /^(#{1,6})\s+(ADR-[A-Z0-9-]+)\b/m;

const REQUIRED_ADR_FIELDS = ["id", "title", "status", "date", "project", "risk"];
const ALLOWED_STATUS = new Set(["proposed", "accepted", "deprecated", "superseded"]);
const ALLOWED_RISK = new Set(["stable", "at_risk", "overridden"]);

const HARDCODED_PATH_PATTERNS = [
  {
    id: "hardcoded-absolute-path",
    re: /(^|[^a-zA-Z0-9_])(\/Users\/|~\/|[A-Za-z]:\\)/,
    message: "Avoid absolute filesystem paths; use IDs/conceptual roots instead.",
  },
  {
    id: "hardcoded-repo-path",
    re: /\b(packages|mods|apps)\/\S+|\bdocs\/(projects|system|process|product|_templates|_archive)\/\S+|\b(resources|milestones|issues)\/\S+/,
    message: "Avoid repo-relative paths; use IDs (DocId/ADR/issue IDs) instead.",
  },
  {
    id: "hardcoded-file-with-extension",
    re: /\b[\w.-]+\/[\w./-]+\.(ts|tsx|js|mjs|cjs|md|json|yaml|yml|sh)\b/,
    message: "Avoid hard-coded file paths; describe the concept instead.",
  },
];

function parseArgs(argv) {
  const args = {
    roots: [],
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") continue;
    if (token === "--root") {
      const value = argv[i + 1];
      if (!value) throw new Error("--root requires a value");
      args.roots.push(value);
      i += 1;
      continue;
    }
    if (token === "--json") {
      args.json = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown arg: ${token}`);
  }

  return args;
}

async function walkDir(rootDir, onFile) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        if (DEFAULT_EXCLUDE_DIR_NAMES.has(entry.name)) return;
        await walkDir(entryPath, onFile);
        return;
      }
      if (entry.isFile()) {
        await onFile(entryPath);
      }
    }),
  );
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const raw = text.slice(4, end);
  const body = text.slice(end + 5);

  const map = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }

  return { map, body };
}

function findLineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function lintAdrFile(filePath, text, { archived }) {
  const findings = [];

  const fm = parseFrontmatter(text);
  if (!fm) {
    findings.push({
      rule: "adr-frontmatter-missing",
      path: filePath,
      line: 1,
      message: "ADR files must start with YAML frontmatter.",
    });
    return findings;
  }

  for (const key of REQUIRED_ADR_FIELDS) {
    if (!fm.map.has(key)) {
      findings.push({
        rule: "adr-frontmatter-required-field",
        path: filePath,
        line: 1,
        message: `Missing required frontmatter field: ${key}`,
      });
    }
  }

  if (archived) {
    if (!fm.map.has("archived")) {
      findings.push({
        rule: "adr-archived-missing-flag",
        path: filePath,
        line: 1,
        message: "Archived ADRs must have `archived: true` in frontmatter.",
      });
    }
  }

  const status = fm.map.get("status")?.replaceAll('"', "");
  if (status && !ALLOWED_STATUS.has(status)) {
    findings.push({
      rule: "adr-frontmatter-status",
      path: filePath,
      line: 1,
      message: `Invalid status: ${status} (expected one of: ${[...ALLOWED_STATUS].join(", ")})`,
    });
  }

  const risk = fm.map.get("risk")?.replaceAll('"', "");
  if (risk && !ALLOWED_RISK.has(risk)) {
    findings.push({
      rule: "adr-frontmatter-risk",
      path: filePath,
      line: 1,
      message: `Invalid risk: ${risk} (expected one of: ${[...ALLOWED_RISK].join(", ")})`,
    });
  }

  const date = fm.map.get("date")?.replaceAll('"', "");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    findings.push({
      rule: "adr-frontmatter-date",
      path: filePath,
      line: 1,
      message: `Invalid date: ${date} (expected YYYY-MM-DD)`,
    });
  }

  const id = fm.map.get("id")?.replaceAll('"', "");
  const headingMatch = fm.body.match(/^\s*#\s+(ADR-[A-Z0-9-]+)\b/m);
  if (id && headingMatch && headingMatch[1] !== id) {
    findings.push({
      rule: "adr-heading-id-mismatch",
      path: filePath,
      line: findLineNumber(text, text.indexOf(headingMatch[0])),
      message: `Heading ADR ID (${headingMatch[1]}) does not match frontmatter id (${id}).`,
    });
  }

  if (!archived) {
    for (const pattern of HARDCODED_PATH_PATTERNS) {
      const m = text.match(pattern.re);
      if (!m) continue;
      findings.push({
        rule: pattern.id,
        path: filePath,
        line: findLineNumber(text, m.index ?? 0),
        message: pattern.message,
      });
    }
  }

  return findings;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(`lint-doc-adrs

Usage:
  node scripts/lint/lint-doc-adrs.mjs [--root <path>]... [--json]

Defaults:
  --root ${DEFAULT_SEARCH_ROOTS.join(" --root ")}
`);
    return;
  }

  const roots = args.roots.length ? args.roots : DEFAULT_SEARCH_ROOTS;

  const findings = [];
  const adrDirs = new Set();

  // Discover ADR dirs and lint ADR files.
  for (const root of roots) {
    const rootStat = await stat(root).catch(() => null);
    if (!rootStat) continue;

    await walkDir(root, async (filePath) => {
      if (!filePath.endsWith(".md")) return;

      const normalized = filePath.replaceAll(path.sep, "/");
      if (normalized.endsWith("/resources/spec/adr/ADR.md")) {
        adrDirs.add(normalized.replace(/\/ADR\.md$/, ""));
      }
    });
  }

  for (const adrDir of adrDirs) {
    await walkDir(adrDir, async (filePath) => {
      if (!filePath.endsWith(".md")) return;
      const normalized = filePath.replaceAll(path.sep, "/");
      if (normalized.endsWith("/ADR.md")) return;

      const isArchived = normalized.includes("/resources/spec/adr/_archived/");
      const content = await readFile(filePath, "utf-8");
      findings.push(...lintAdrFile(normalized, content, { archived: isArchived }));
    });
  }

  // Prevent "compiled ADR registers" in project docs.
  for (const root of roots) {
    const rootStat = await stat(root).catch(() => null);
    if (!rootStat) continue;

    await walkDir(root, async (filePath) => {
      if (!filePath.endsWith(".md")) return;
      const normalized = filePath.replaceAll(path.sep, "/");
      if (normalized.includes("/resources/spec/adr/")) return;
      if (normalized === "docs/system/ADR.md") return;

      const content = await readFile(filePath, "utf-8");
      const match = content.match(ADR_HEADING_RE);
      if (!match) return;

      findings.push({
        rule: "adr-register-not-split",
        path: normalized,
        line: findLineNumber(content, match.index ?? 0),
        message:
          "Project ADR content must live as individual files under `resources/spec/adr/` (not a compiled register).",
      });
    });
  }

  if (args.json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
  } else if (findings.length) {
    // eslint-disable-next-line no-console
    console.error(`ADR lint failed (${findings.length} findings):`);
    for (const f of findings) {
      // eslint-disable-next-line no-console
      console.error(`- ${f.path}:${f.line} [${f.rule}] ${f.message}`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("ADR lint OK");
  }

  if (findings.length) process.exitCode = 1;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
