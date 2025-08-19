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

import { mkdir, readdir, stat, copyFile } from "node:fs/promises";
import path from "node:path";

type CopyResult = {
  copied: number;
  skipped: number;
  errors: number;
};

const PKG_CWD = process.cwd();
const SRC_DIR = path.join(PKG_CWD, "src");
const DIST_DIR = path.join(PKG_CWD, "dist");

// Allowed file extensions to copy for the CIV7 mod runtime
const ALLOWED_EXTS = new Set<string>([".js", ".xml", ".modinfo"]);

// Optional: ignore list (case-insensitive suffix or exact filename checks)
const IGNORE_SUFFIXES = [
  ".d.ts", // editor typings only
  ".map", // sourcemaps (not needed by CIV7 runtime)
];

// Run the build
async function main() {
  const res: CopyResult = { copied: 0, skipped: 0, errors: 0 };

  // Ensure dist exists
  await mkdir(DIST_DIR, { recursive: true });

  // Verify src exists
  const srcOk = await exists(SRC_DIR);
  if (!srcOk) {
    logWarn(`Source directory not found: ${rel(SRC_DIR)} — nothing to copy.`);
    printSummary(res);
    return;
  }

  await copyTree(SRC_DIR, DIST_DIR, res);

  printSummary(res);
}

async function copyTree(fromDir: string, toDir: string, res: CopyResult) {
  const entries = await readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const fromPath = path.join(fromDir, entry.name);
    const toPath = path.join(toDir, entry.name);

    try {
      if (entry.isDirectory()) {
        await mkdir(toPath, { recursive: true });
        await copyTree(fromPath, toPath, res);
        continue;
      }

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (shouldIgnore(entry.name)) {
          res.skipped++;
          continue;
        }

        if (!ALLOWED_EXTS.has(ext)) {
          res.skipped++;
          continue;
        }

        await mkdir(path.dirname(toPath), { recursive: true });
        await copyFile(fromPath, toPath);
        res.copied++;
        logCopy(fromPath, toPath);
      } else {
        // Non-file/non-directory entries (symlinks, etc.) are skipped
        res.skipped++;
      }
    } catch (err) {
      res.errors++;
      logError(`Failed to copy ${rel(fromPath)} → ${rel(toPath)}: ${String(err)}`);
    }
  }
}

function shouldIgnore(filename: string): boolean {
  const lower = filename.toLowerCase();
  for (const suf of IGNORE_SUFFIXES) {
    if (lower.endsWith(suf)) return true;
  }
  return false;
}

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

function logCopy(fromPath: string, toPath: string) {
  console.log(`→ ${rel(toPath)}  [from ${rel(fromPath)}]`);
}

function logWarn(msg: string) {
  console.log(`[warn] ${msg}`);
}

function logError(msg: string) {
  console.error(`[error] ${msg}`);
}

function printSummary(res: CopyResult) {
  console.log(
    `CIV7 artifacts: copied=${res.copied} skipped=${res.skipped} errors=${res.errors}`
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
