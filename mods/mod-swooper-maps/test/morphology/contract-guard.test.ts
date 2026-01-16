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

  it("does not use morphology effect-tag gating in migrated consumer contracts", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const migratedContracts: Array<{
      file: string;
      mustRequire: "topography" | "landmasses";
    }> = [
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/narrative-pre/steps/storySeed.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/narrative-pre/steps/storyHotspots.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/hydrology-pre/steps/lakes.contract.ts"),
        mustRequire: "topography",
      },
      {
        file: path.join(repoRoot, "src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts"),
        mustRequire: "landmasses",
      },
    ];

    for (const { file, mustRequire } of migratedContracts) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("M4_EFFECT_TAGS.engine.coastlinesApplied");
      expect(text).not.toContain("M4_EFFECT_TAGS.engine.landmassApplied");

      if (mustRequire === "topography") {
        expect(text).toContain("morphologyArtifacts.topography");
      } else {
        expect(text).toContain("morphologyArtifacts.landmasses");
      }
    }
  });
});
