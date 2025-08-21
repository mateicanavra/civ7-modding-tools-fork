/**
 * Build script: copy CIV7 mod artifacts from src → dist preserving structure.
 *
 * What it does:
 * - Recursively scans ./src
 * - Copies only files needed by the CIV7 client runtime:
 *   - .js (map entries and supporting modules)
 *   - .xml (config and localized text)
 *   - .modinfo (mod descriptor)
 * - Preserves directory structure under ./dist
 *
 * Usage (from this package directory):
 *   bun run scripts/build.ts
 *
 * Notes:
 * - This script does not clean dist. It simply ensures required folders exist
 *   and copies updated artifacts over whatever tsup produced.
 * - It is safe to run after the TypeScript build (tsup) so dist contains both
 *   library outputs and CIV7 mod artifacts.
 */

import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { copyDirectoryRecursive } from "@civ7/plugin-files";

const PKG_CWD = process.cwd();
const SRC_DIR = path.join(PKG_CWD, "src");
const DIST_DIR = path.join(PKG_CWD, "dist");

// Allowed file extensions to copy for the CIV7 mod runtime
const ALLOWED_EXTS = new Set<string>([".js", ".xml", ".modinfo"]);

// Run the build
async function main() {
  // Ensure dist exists
  await mkdir(DIST_DIR, { recursive: true });

  // Verify src exists
  const srcOk = await exists(SRC_DIR);
  if (!srcOk) {
    logWarn(`Source directory not found: ${rel(SRC_DIR)} — nothing to copy.`);
    return;
  }

  // Use shared file copy to keep logic consistent across plugins
  const summary = copyDirectoryRecursive(SRC_DIR, DIST_DIR, {
    filter: (rel, entry) => {
      if (!entry.isFile()) return true; // directories handled by recursion
      const lower = rel.toLowerCase();
      if (lower.endsWith('.d.ts') || lower.endsWith('.map')) return false;
      const ext = path.extname(lower);
      return ext === '.js' || ext === '.xml' || ext === '.modinfo';
    },
  });

  printSummary(summary);
}

// copyTree removed in favor of shared copyDirectoryRecursive

function shouldIgnore(_filename: string): boolean { return false; }

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------- logging ---------------------------------- */

function rel(p: string): string {
  return path.relative(PKG_CWD, p) || ".";
}

function logWarn(msg: string) {
  console.log(`[warn] ${msg}`);
}

function logError(msg: string) {
  console.error(`[error] ${msg}`);
}

function printSummary(summary: { copiedFiles: number; skippedEntries: number; errors: number }) {
  console.log(
    `CIV7 artifacts: copied=${summary.copiedFiles} skipped=${summary.skippedEntries} errors=${summary.errors}`
  );
}

/* -------------------------------------------------------------------------- */

if (import.meta.url === `file://${process.argv[1]}`) {
  // Executed directly: run main()
  main().catch((err) => {
    logError(String(err));
    process.exit(1);
  });
}

export {};
