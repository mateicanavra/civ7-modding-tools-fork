import { describe, expect, it } from "bun:test";

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function listFilesRecursive(rootDir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(rootDir);
  for (const entry of entries) {
    const full = path.join(rootDir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full));
      continue;
    }
    out.push(full);
  }
  return out;
}

describe("morphology contract guardrails", () => {
  it("does not introduce continent projection surfaces in artifact schemas or contracts", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
    ];

    const files = roots.flatMap((root) =>
      listFilesRecursive(root).filter((file) =>
        file.endsWith("artifacts.ts") || file.endsWith("contract.ts")
      )
    );

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("westContinent");
      expect(text).not.toContain("eastContinent");
      expect(text).not.toContain("LandmassRegionId");
    }
  });

  it("does not require morphology effect tags in consumer contracts", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/narrative-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/narrative-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/narrative-post"),
      path.join(repoRoot, "src/recipes/standard/stages/placement/steps/derive-placement-inputs"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-pre/steps"),
    ];

    const files = roots.flatMap((root) =>
      listFilesRecursive(root).filter((file) => file.endsWith("contract.ts"))
    );

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("M4_EFFECT_TAGS.engine.landmassApplied");
      expect(text).not.toContain("M4_EFFECT_TAGS.engine.coastlinesApplied");
    }
  });

  it("does not reintroduce runtime continent windows", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const runtimeFile = path.join(repoRoot, "src/recipes/standard/runtime.ts");
    const text = readFileSync(runtimeFile, "utf8");
    expect(text).not.toContain("westContinent");
    expect(text).not.toContain("eastContinent");
  });
});
