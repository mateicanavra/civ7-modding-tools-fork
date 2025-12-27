#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_PROJECT = "docs/projects/engine-refactor-v1";

const args = process.argv.slice(2);
let projectRoot = DEFAULT_PROJECT;
let write = false;
let ssot = "blocked_by";
let fixLinks = true;
let normalizeBlocked = true;
let verbose = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--project") {
    projectRoot = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--write") {
    write = true;
    continue;
  }
  if (arg === "--ssot") {
    ssot = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--no-fix-links") {
    fixLinks = false;
    continue;
  }
  if (arg === "--no-normalize-blocked") {
    normalizeBlocked = false;
    continue;
  }
  if (arg === "--verbose") {
    verbose = true;
    continue;
  }

  console.error(`Unknown argument: ${arg}`);
  process.exit(1);
}

if (ssot !== "blocked_by" && ssot !== "blocked") {
  console.error(`--ssot must be "blocked_by" or "blocked" (got "${ssot}")`);
  process.exit(1);
}

const cwd = process.cwd();
const projectAbs = path.resolve(cwd, projectRoot);
const issuesDir = path.join(projectAbs, "issues");

const issueFiles = await listMarkdownFiles(issuesDir);
const issueIndex = new Map();
const issueFrontmatter = new Map();

for (const file of issueFiles) {
  const content = await fs.readFile(file, "utf8");
  const fm = parseFrontmatter(content);
  if (!fm || !fm.id) continue;
  issueIndex.set(fm.id, file);
  issueFrontmatter.set(fm.id, {
    file,
    blocked_by: fm.blocked_by ?? [],
    blocked: fm.blocked ?? [],
  });
}

const warnings = new Set();
const changes = new Map();
let linkUpdates = 0;
let docPathUpdates = 0;
let blockedUpdates = 0;

const markdownFiles = await listMarkdownFiles(projectAbs);

for (const file of markdownFiles) {
  let content = await fs.readFile(file, "utf8");
  let nextContent = content;

  if (fixLinks) {
    const linkResult = updateLinks(nextContent, file, issueIndex, warnings);
    nextContent = linkResult.content;
    linkUpdates += linkResult.updates;

    const docResult = updateDocPaths(nextContent, file, issueIndex, warnings);
    nextContent = docResult.content;
    docPathUpdates += docResult.updates;
  }

  if (normalizeBlocked && file.startsWith(issuesDir)) {
    const updateResult = updateBlockedLists(
      nextContent,
      file,
      issueIndex,
      issueFrontmatter,
      ssot,
      warnings,
    );
    nextContent = updateResult.content;
    blockedUpdates += updateResult.updates;
  }

  if (nextContent !== content) {
    changes.set(file, nextContent);
  }
}

if (write) {
  for (const [file, content] of changes) {
    await fs.writeFile(file, content, "utf8");
  }
}

console.log(`Project: ${projectRoot}`);
console.log(`Mode: ${write ? "write" : "dry-run"}`);
console.log(`Files scanned: ${markdownFiles.length}`);
console.log(`Files changed: ${changes.size}`);
console.log(`Link updates: ${linkUpdates}`);
console.log(`Doc path updates: ${docPathUpdates}`);
console.log(`Dependency updates: ${blockedUpdates}`);

if (verbose && changes.size) {
  console.log("\nChanged files:");
  for (const file of changes.keys()) {
    console.log(`- ${file}`);
  }
}

if (warnings.size) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (!write && changes.size) {
  console.log("\nRe-run with --write to apply changes.");
}

function issueSort(a, b) {
  const aNum = Number.parseInt(a.split("-")[1], 10);
  const bNum = Number.parseInt(b.split("-")[1], 10);
  if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
    return a.localeCompare(b);
  }
  return aNum - bNum;
}

function updateBlockedLists(
  content,
  file,
  issueIndex,
  issueFrontmatter,
  ssot,
  warnings,
) {
  const fm = parseFrontmatter(content);
  if (!fm || !fm.id) return { content, updates: 0 };

  const targetId = fm.id;
  const frontmatter = issueFrontmatter.get(targetId);
  if (!frontmatter) return { content, updates: 0 };

  const blockedByMap = new Map();
  for (const [issueId, data] of issueFrontmatter) {
    blockedByMap.set(issueId, data.blocked_by);
  }

  const blockedMap = new Map();
  for (const [issueId, data] of issueFrontmatter) {
    blockedMap.set(issueId, data.blocked);
  }

  const derivedBlocked = new Map();
  const derivedBlockedBy = new Map();

  if (ssot === "blocked_by") {
    for (const [issueId, blockers] of blockedByMap) {
      for (const blocker of blockers) {
        if (!issueIndex.has(blocker)) {
          warnings.add(
            `${issueId} blocked_by references unknown issue "${blocker}"`,
          );
          continue;
        }
        if (!derivedBlocked.has(blocker)) {
          derivedBlocked.set(blocker, []);
        }
        derivedBlocked.get(blocker).push(issueId);
      }
    }
  } else {
    for (const [issueId, blockees] of blockedMap) {
      for (const blockee of blockees) {
        if (!issueIndex.has(blockee)) {
          warnings.add(
            `${issueId} blocked references unknown issue "${blockee}"`,
          );
          continue;
        }
        if (!derivedBlockedBy.has(blockee)) {
          derivedBlockedBy.set(blockee, []);
        }
        derivedBlockedBy.get(blockee).push(issueId);
      }
    }
  }

  const updates = [];
  if (ssot === "blocked_by") {
    const nextBlocked = (derivedBlocked.get(targetId) ?? [])
      .slice()
      .sort(issueSort);
    updates.push({ key: "blocked", value: nextBlocked });
  } else {
    const nextBlockedBy = (derivedBlockedBy.get(targetId) ?? [])
      .slice()
      .sort(issueSort);
    updates.push({ key: "blocked_by", value: nextBlockedBy });
  }

  let nextContent = content;
  let updateCount = 0;
  for (const update of updates) {
    const result = replaceFrontmatterList(nextContent, update.key, update.value);
    nextContent = result.content;
    if (result.updated) updateCount += 1;
  }

  return { content: nextContent, updates: updateCount };
}

function updateLinks(content, file, issueIndex, warnings) {
  let updates = 0;
  const updated = content.replace(/\]\(([^)]+)\)/g, (match, target) => {
    if (isExternalLink(target)) return match;
    const { pathPart, hashPart } = splitHash(target);
    const idMatch = pathPart.match(/CIV-\d+/);
    if (!idMatch) return match;

    const issueId = idMatch[0];
    const issuePath = issueIndex.get(issueId);
    if (!issuePath) {
      warnings.add(`${file}: link references unknown issue "${issueId}"`);
      return match;
    }

    const nextPath = toPosix(
      path.relative(path.dirname(file), issuePath),
    );
    const nextTarget = hashPart ? `${nextPath}#${hashPart}` : nextPath;
    if (nextTarget === target) return match;
    updates += 1;
    return `](${nextTarget})`;
  });

  return { content: updated, updates };
}

function updateDocPaths(content, file, issueIndex, warnings) {
  let updates = 0;
  const updated = content.replace(
    /^(\s*doc:\s*)(\S+)\s*$/gm,
    (match, prefix, target) => {
      const idMatch = target.match(/CIV-\d+/);
      if (!idMatch) return match;
      const issueId = idMatch[0];
      const issuePath = issueIndex.get(issueId);
      if (!issuePath) {
        warnings.add(`${file}: doc path references unknown issue "${issueId}"`);
        return match;
      }
      const nextPath = toPosix(
        path.relative(path.dirname(file), issuePath),
      );
      if (nextPath === target) return match;
      updates += 1;
      return `${prefix}${nextPath}`;
    },
  );

  return { content: updated, updates };
}

function parseFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = content.slice(3, end).trim();
  const lines = block.split("\n");
  const result = {};
  for (const line of lines) {
    const idMatch = line.match(/^id:\s*(\S+)\s*$/);
    if (idMatch) {
      result.id = idMatch[1];
      continue;
    }
    const blockedByMatch = line.match(/^blocked_by:\s*\[(.*)\]\s*$/);
    if (blockedByMatch) {
      result.blocked_by = splitList(blockedByMatch[1]);
      continue;
    }
    const blockedMatch = line.match(/^blocked:\s*\[(.*)\]\s*$/);
    if (blockedMatch) {
      result.blocked = splitList(blockedMatch[1]);
      continue;
    }
  }
  return result;
}

function splitList(value) {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function replaceFrontmatterList(content, key, items) {
  if (!content.startsWith("---")) return { content, updated: false };
  const end = content.indexOf("\n---", 3);
  if (end === -1) return { content, updated: false };

  const before = content.slice(0, 3);
  const block = content.slice(3, end);
  const after = content.slice(end);
  const lines = block.split("\n");
  const nextValue = items.length ? items.join(", ") : "";
  const nextLine = `${key}: [${nextValue}]`;

  let updated = false;
  let found = false;
  const nextLines = lines.map((line) => {
    if (line.trimStart().startsWith(`${key}:`)) {
      found = true;
      if (line.trim() !== nextLine) {
        updated = true;
      }
      return line.replace(/^(\s*).*/, `$1${nextLine}`);
    }
    return line;
  });

  if (!found) {
    nextLines.push(nextLine);
    updated = true;
  }

  return { content: `${before}${nextLines.join("\n")}${after}`, updated };
}

function splitHash(target) {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) return { pathPart: target, hashPart: "" };
  return {
    pathPart: target.slice(0, hashIndex),
    hashPart: target.slice(hashIndex + 1),
  };
}

function isExternalLink(target) {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("#")
  );
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function listMarkdownFiles(root) {
  const results = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const nested = await listMarkdownFiles(entryPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(entryPath);
    }
  }
  return results;
}
