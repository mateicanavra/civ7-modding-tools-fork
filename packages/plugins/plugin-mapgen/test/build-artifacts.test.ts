import { mkdtemp, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { buildMapMod } from "..";

async function makeTempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "mapgen-test-"));
}

describe("buildMapMod", () => {
  it("copies only allowed files", async () => {
    const src = await makeTempDir();
    const dest = await makeTempDir();
    try {
      await writeFile(path.join(src, "keep.js"), "");
      await writeFile(path.join(src, "keep.xml"), "");
      await writeFile(path.join(src, "keep.modinfo"), "");
      await writeFile(path.join(src, "skip.txt"), "");

      await buildMapMod(src, dest);

      await stat(path.join(dest, "keep.js"));
      await stat(path.join(dest, "keep.xml"));
      await stat(path.join(dest, "keep.modinfo"));
      await expect(stat(path.join(dest, "skip.txt")).catch(() => false)).resolves.toBe(false);
    } finally {
      await rm(src, { recursive: true, force: true });
      await rm(dest, { recursive: true, force: true });
    }
  });
});
