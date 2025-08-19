import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pkgDir = path.resolve(__dirname, "..");
const archiveRoot = path.join(pkgDir, "js-archive", "src");
const distRoot = path.join(pkgDir, "dist");

async function listJsFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsFiles(full, base)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

describe("compiled output", () => {
  it("emits JS for each archived source", async () => {
    const files = await listJsFiles(archiveRoot);
    for (const rel of files) {
      await fs.stat(path.join(distRoot, rel));
    }
  });
});
