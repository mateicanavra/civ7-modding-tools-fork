#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_ROOTS = ["docs"];
const DEFAULT_BASELINE_PATH = "docs/.doc-ambiguity-lint-baseline.json";

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

/**
 * Patterns marked `noisy: true` are disabled by default.
 * Enable them with `--include-noisy`.
 */
const PATTERNS = [
  {
    category: "Vagueness",
    label: "Vague frequency",
    noisy: false,
    phrases: [
      "usually",
      "generally",
      "typically",
      "most of the time",
      "for the most part",
      "in general",
    ],
  },
  {
    category: "Timing",
    label: "Vague timing",
    noisy: false,
    phrases: [
      "as soon as",
      "as soon as possible",
      "asap",
      "in the near future",
      "at some point",
      "eventually",
    ],
  },
  {
    category: "Conditions",
    label: "Vague conditions",
    noisy: false,
    phrases: [
      "as needed",
      "if necessary",
      "when appropriate",
      "as appropriate",
      "where appropriate",
      "if applicable",
      "where applicable",
    ],
  },
  {
    category: "Optionality",
    label: "Preference/optionality",
    noisy: false,
    phrases: [
      "only if you want",
      "if you want",
      "if you'd like",
      "if you would like",
      "feel free to",
      "up to you",
      "optionally",
    ],
  },
  {
    category: "Commitment",
    label: "Weak commitment",
    noisy: false,
    phrases: ["best effort", "try to", "attempt to", "aim to", "we plan to", "we hope to"],
  },
  {
    category: "Vagueness",
    label: "Vague quantity (noisy)",
    noisy: true,
    phrases: [
      "some",
      "a few",
      "several",
      "many",
      "a lot of",
      "plenty of",
      "small number of",
      "large number of",
    ],
  },
  {
    category: "Scope",
    label: "Unbounded scope (noisy)",
    noisy: true,
    phrases: ["etc.", "and so on", "and the like", "various", "miscellaneous"],
  },
  {
    category: "Modality",
    label: "Soft modal verbs (noisy)",
    noisy: true,
    phrases: ["may", "might", "should", "could"],
  },
];

const IGNORE_DIRECTIVE_RE = /(doc-ambiguity-lint|lint-doc-ambiguity):\s*ignore\b/i;

function parseArgs(argv) {
  const args = {
    roots: [],
    includeNoisy: false,
    maxResults: Infinity,
    json: false,
    baselinePath: null,
    writeBaselinePath: null,
    includeBaselineFindings: false,
  };

  for (let index = 2; index < argv.length; index++) {
    const value = argv[index];

    if (value === "--") continue;

    if (value === "--include-noisy") {
      args.includeNoisy = true;
      continue;
    }

    if (value === "--json") {
      args.json = true;
      continue;
    }

    if (value === "--baseline") {
      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        args.baselinePath = next;
        index++;
      } else {
        args.baselinePath = DEFAULT_BASELINE_PATH;
      }
      continue;
    }

    if (value === "--write-baseline") {
      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        args.writeBaselinePath = next;
        index++;
      } else {
        args.writeBaselinePath = DEFAULT_BASELINE_PATH;
      }
      continue;
    }

    if (value === "--include-baseline") {
      args.includeBaselineFindings = true;
      continue;
    }

    if (value === "--root" || value === "--roots") {
      const next = argv[index + 1];
      if (!next) throw new Error(`${value} requires a path`);
      args.roots.push(next);
      index++;
      continue;
    }

    if (value === "--max") {
      const next = argv[index + 1];
      if (!next) throw new Error("--max requires a number");
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error("--max must be a non-negative number");
      args.maxResults = parsed === 0 ? Infinity : parsed;
      index++;
      continue;
    }

    if (value === "-h" || value === "--help") {
      printHelp();
      process.exit(0);
    }

    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }

    args.roots.push(value);
  }

  if (args.roots.length === 0) args.roots = [...DEFAULT_ROOTS];
  return args;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`lint-doc-ambiguity

Usage:
  node scripts/lint/lint-doc-ambiguity.mjs [--root <path>] [--include-noisy] [--max <n>] [--json] [--baseline [path]] [--write-baseline [path]]

Defaults:
  --root docs
  --baseline ${DEFAULT_BASELINE_PATH}

Notes:
  - A "block" is a paragraph delimited by blank lines (outside fenced code blocks).
  - Patterns marked "noisy" are disabled unless you pass --include-noisy.
  - --max 0 means unlimited (default).
  - If you pass --baseline, the report only includes new findings by default.
  - Use --include-baseline to include findings already present in the baseline.
  - To ignore a block, add an HTML comment containing: "doc-ambiguity-lint: ignore"
`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toBoundaryRegex(phrase) {
  // Not preceded/followed by a letter/number/_ (Unicode-aware).
  const escaped = escapeRegex(phrase);
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");
}

function isFenceLine(trimmedLine) {
  if (trimmedLine.startsWith("```")) return "```";
  if (trimmedLine.startsWith("~~~")) return "~~~";
  return null;
}

function normalizeBlockText(blockText) {
  return blockText.replace(/\s+/g, " ").trim();
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function getBlockHash(blockText) {
  return sha256Hex(normalizeBlockText(blockText));
}

async function* walkMarkdownFiles(rootPath) {
  const rootStats = await stat(rootPath).catch(() => null);
  if (!rootStats) return;

  if (rootStats.isFile()) {
    if (rootPath.toLowerCase().endsWith(".md")) yield rootPath;
    return;
  }

  const queue = [rootPath];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;

    const dirents = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const dirent of dirents) {
      const nextPath = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        if (DEFAULT_EXCLUDE_DIR_NAMES.has(dirent.name)) continue;
        queue.push(nextPath);
        continue;
      }

      if (!dirent.isFile()) continue;
      if (!dirent.name.toLowerCase().endsWith(".md")) continue;
      yield nextPath;
    }
  }
}

function extractBlocks(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  const blocks = [];

  let currentLines = [];
  let startLine = 1;
  let fence = null;

  const flush = (endLine) => {
    if (currentLines.length === 0) return;
    const text = currentLines.join("\n").trimEnd();
    if (text.length > 0) {
      blocks.push({
        startLine,
        endLine,
        text,
      });
    }
    currentLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    const fenceMarker = isFenceLine(trimmed);
    if (fenceMarker) {
      if (fence === null) {
        flush(lineNumber - 1);
        fence = fenceMarker;
      } else if (fence === fenceMarker) {
        fence = null;
      }
      continue;
    }

    if (fence !== null) continue;

    if (trimmed === "") {
      flush(lineNumber - 1);
      startLine = lineNumber + 1;
      continue;
    }

    if (currentLines.length === 0) startLine = lineNumber;
    currentLines.push(line);
  }

  flush(lines.length);
  return blocks;
}

function isIgnoredBlock(blockText) {
  return IGNORE_DIRECTIVE_RE.test(blockText);
}

function buildMatchers(includeNoisy) {
  const enabled = includeNoisy ? PATTERNS : PATTERNS.filter((p) => !p.noisy);
  const matchers = [];
  for (const group of enabled) {
    for (const phrase of group.phrases) {
      matchers.push({
        phrase,
        category: group.category,
        label: group.label,
        regex: toBoundaryRegex(phrase),
      });
    }
  }
  return matchers;
}

function findMatchesInBlock(blockText, matchers) {
  const matches = [];
  for (const matcher of matchers) {
    matcher.regex.lastIndex = 0;
    const found = matcher.regex.exec(blockText);
    if (!found) continue;
    matches.push({
      phrase: matcher.phrase,
      category: matcher.category,
      label: matcher.label,
      sample: found[0],
    });
  }
  return matches;
}

function toRepoRelative(filePath) {
  const cwd = process.cwd();
  const relative = path.relative(cwd, filePath);
  return relative === "" ? filePath : relative;
}

function printTextReport({ results, baselineInfo }) {
  const categoryCounts = new Map();
  const fileCounts = new Map();

  for (const result of results) {
    for (const match of result.matches) {
      categoryCounts.set(match.category, (categoryCounts.get(match.category) ?? 0) + 1);
    }
    fileCounts.set(result.filePath, (fileCounts.get(result.filePath) ?? 0) + 1);
  }

  const baselineSummary =
    baselineInfo === null
      ? ""
      : `Baseline: ${baselineInfo.path} (entries=${baselineInfo.entryCount}; included=${baselineInfo.includeBaselineFindings})\nNew findings: ${baselineInfo.newFindingCount}\n\n`;

  // eslint-disable-next-line no-console
  console.log(
    baselineSummary +
      [
      `Matches: ${results.length}`,
      `Files: ${fileCounts.size}`,
      `Categories: ${[...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => `${category}=${count}`)
        .join(", ")}`,
      "",
    ].join("\n"),
  );

  for (const result of results) {
    const matchLabel = result.matches
      .map((m) => `${m.category}/${m.label}: "${m.sample}" [${m.id.slice(0, 12)}]`)
      .join("; ");

    // eslint-disable-next-line no-console
    console.log(`---\n${result.filePath}:${result.startLine}\n${matchLabel}\n\n${result.text}\n`);
  }
}

async function loadBaselineIds(baselinePath) {
  const raw = await readFile(baselinePath, "utf8").catch((error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (raw === null) return new Set();

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return new Set(parsed.map((item) => item.id).filter(Boolean));
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) return new Set(parsed.items.map((item) => item.id).filter(Boolean));
  return new Set();
}

async function writeBaselineFile({ baselinePath, items, includeNoisy }) {
  const dir = path.dirname(baselinePath);
  await mkdir(dir, { recursive: true });

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    includeNoisy,
    entryCount: items.length,
    items,
  };

  await writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const matchers = buildMatchers(args.includeNoisy);

  const baselinePath = args.writeBaselinePath ?? args.baselinePath;
  const baselineIds =
    args.baselinePath === null || args.writeBaselinePath !== null ? null : await loadBaselineIds(args.baselinePath);

  const results = [];
  const seenFiles = new Set();
  const baselineItemsById = new Map();
  let newFindingCount = 0;

  for (const root of args.roots) {
    for await (const filePath of walkMarkdownFiles(root)) {
      const relativePath = toRepoRelative(filePath);
      if (seenFiles.has(relativePath)) continue;
      seenFiles.add(relativePath);

      const text = await readFile(filePath, "utf8").catch(() => null);
      if (text === null) continue;

      const blocks = extractBlocks(text);
      for (const block of blocks) {
        if (isIgnoredBlock(block.text)) continue;

        const matches = findMatchesInBlock(block.text, matchers);
        if (matches.length === 0) continue;

        const blockHash = getBlockHash(block.text);
        const matchesWithIds = matches
          .map((match) => {
            const phraseKey = `${match.category}::${match.label}::${match.phrase.toLowerCase()}`;
            const id = sha256Hex(`${relativePath}\n${blockHash}\n${phraseKey}`);
            const isNew = baselineIds === null ? true : !baselineIds.has(id);
            return { ...match, id, isNew };
          })
          .filter((match) => args.includeBaselineFindings || baselineIds === null || match.isNew);

        if (matchesWithIds.length === 0) continue;

        if (baselineIds !== null) {
          newFindingCount += matchesWithIds.filter((m) => m.isNew).length;
        }

        results.push({
          filePath: relativePath,
          startLine: block.startLine,
          endLine: block.endLine,
          text: block.text,
          matches: matchesWithIds,
        });

        if (args.writeBaselinePath !== null) {
          for (const match of matchesWithIds) {
            baselineItemsById.set(match.id, {
              id: match.id,
              filePath: relativePath,
              category: match.category,
              label: match.label,
              phrase: match.phrase,
              blockHash,
              blockPreview: normalizeBlockText(block.text).slice(0, 160),
            });
          }
        }

        if (results.length >= args.maxResults) break;
      }

      if (results.length >= args.maxResults) break;
    }
    if (results.length >= args.maxResults) break;
  }

  results.sort((a, b) =>
    a.filePath === b.filePath ? a.startLine - b.startLine : a.filePath.localeCompare(b.filePath),
  );

  if (args.writeBaselinePath !== null) {
    const items = [...baselineItemsById.values()].sort((a, b) =>
      a.filePath === b.filePath ? a.id.localeCompare(b.id) : a.filePath.localeCompare(b.filePath),
    );
    await writeBaselineFile({ baselinePath: args.writeBaselinePath, items, includeNoisy: args.includeNoisy });
    // eslint-disable-next-line no-console
    console.log(`Wrote baseline: ${args.writeBaselinePath} (entries=${items.length})`);
    return;
  }

  if (args.json) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          roots: args.roots,
          includeNoisy: args.includeNoisy,
          baseline: args.baselinePath,
          includeBaselineFindings: args.includeBaselineFindings,
          newFindingCount: baselineIds === null ? results.length : newFindingCount,
          results,
        },
        null,
        2,
      ),
    );
    return;
  }

  printTextReport({
    results,
    baselineInfo:
      args.baselinePath === null
        ? null
        : {
            path: baselinePath ?? DEFAULT_BASELINE_PATH,
            entryCount: baselineIds?.size ?? 0,
            includeBaselineFindings: args.includeBaselineFindings,
            newFindingCount,
          },
  });

  const shouldFail = args.baselinePath === null ? results.length > 0 : newFindingCount > 0;
  if (shouldFail) process.exitCode = 1;
}

await main();
