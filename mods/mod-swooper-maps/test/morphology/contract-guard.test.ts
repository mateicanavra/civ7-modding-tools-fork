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
  it("does not introduce runtime-continent or LandmassRegionId surfaces into morphology contracts", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const contracts = [
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre/artifacts.ts"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre/steps"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid/steps"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post/steps"),
    ];

    const files = contracts.flatMap((candidate) => {
      try {
        const stat = statSync(candidate);
        if (stat.isDirectory()) {
          return listFilesRecursive(candidate).filter(
            (file) => file.endsWith("contract.ts") || file.endsWith("artifacts.ts")
          );
        }
        return [candidate];
      } catch {
        return [];
      }
    });

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("westContinent");
      expect(text).not.toContain("eastContinent");
      expect(text).not.toContain("LandmassRegionId");
    }
  });
});

