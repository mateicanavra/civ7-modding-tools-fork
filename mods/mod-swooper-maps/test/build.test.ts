import { mkdtemp, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { build } from "../build";

async function makeTempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "maps-test-"));
}

describe("build", () => {
  it("copies allowed files to output", async () => {
    const src = await makeTempDir();
    const dest = await makeTempDir();
    try {
      await writeFile(path.join(src, "a.js"), "console.log('ok')");
      await writeFile(path.join(src, "b.xml"), "<root/>");
      await writeFile(path.join(src, "c.modinfo"), "mod");
      await writeFile(path.join(src, "ignore.txt"), "nope");

      await build(src, dest);

      await stat(path.join(dest, "a.js"));
      await stat(path.join(dest, "b.xml"));
      await stat(path.join(dest, "c.modinfo"));
      await expect(stat(path.join(dest, "ignore.txt")).catch(() => false)).resolves.toBe(false);
    } finally {
      await rm(src, { recursive: true, force: true });
      await rm(dest, { recursive: true, force: true });
    }
  });
});
