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

  it("does not reintroduce runtime-continent or LandmassRegionId surfaces in morphology/hydrology steps", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-pre/steps"),
    ];

    const files = roots.flatMap((candidate) => {
      try {
        const stat = statSync(candidate);
        if (stat.isDirectory()) {
          return listFilesRecursive(candidate).filter((file) => file.endsWith(".ts"));
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
      expect(text).not.toContain("markLandmassId(");
    }
  });

  it("does not publish HOTSPOTS overlays from morphology steps", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
    ];

    const files = roots.flatMap((candidate) => {
      try {
        const stat = statSync(candidate);
        if (stat.isDirectory()) {
          return listFilesRecursive(candidate).filter((file) => file.endsWith(".ts"));
        }
        return [candidate];
      } catch {
        return [];
      }
    });

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const calls = Array.from(text.matchAll(/publishStoryOverlay\s*\([\s\S]{0,200}\)/g));
      const publishesHotspots = calls.some((match) =>
        /HOTSPOTS|["']hotspots["']/.test(match[0])
      );
      expect(publishesHotspots).toBe(false);
    }
  });

  it("does not import legacy config bags in morphology contracts or steps", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
    ];

    const files = roots.flatMap((candidate) => {
      try {
        const stat = statSync(candidate);
        if (stat.isDirectory()) {
          return listFilesRecursive(candidate).filter((file) => file.endsWith(".ts"));
        }
        return [candidate];
      } catch {
        return [];
      }
    });

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("@mapgen/domain/config");
    }
  });

  it("does not reintroduce legacy morphology module imports", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const srcRoot = path.join(repoRoot, "src");
    const legacyImports = [
      "@mapgen/domain/morphology/landmass",
      "@mapgen/domain/morphology/coastlines",
      "@mapgen/domain/morphology/islands",
      "@mapgen/domain/morphology/mountains",
      "@mapgen/domain/morphology/volcanoes",
    ];

    const files = listFilesRecursive(srcRoot).filter((file) => file.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const legacyImport of legacyImports) {
        expect(text).not.toContain(legacyImport);
      }
    }
  });

  it("does not use legacy morphology config keys in map configs", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const mapsRoot = path.join(repoRoot, "src/maps");
    const candidates = [
      ...listFilesRecursive(mapsRoot).filter((file) => file.endsWith(".ts")),
      path.join(repoRoot, "test/standard-run.test.ts"),
    ];

    const legacyKeyPatterns = [/\blandmass\s*:/, /\boceanSeparation\s*:/];

    for (const file of candidates) {
      const text = readFileSync(file, "utf8");
      for (const pattern of legacyKeyPatterns) {
        expect(text).not.toMatch(pattern);
      }
    }
  });

  it("publishes HOTSPOTS only from the narrative-owned producer", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const srcRoot = path.join(repoRoot, "src");
    const allowed = ["src/domain/narrative/tagging/hotspots.ts"];

    const files = listFilesRecursive(srcRoot).filter((file) => file.endsWith(".ts"));
    const publishers = files
      .filter((file) => {
        const text = readFileSync(file, "utf8");
        const calls = Array.from(text.matchAll(/publishStoryOverlay\s*\([\s\S]{0,200}\)/g));
        return calls.some((match) => /HOTSPOTS|["']hotspots["']/.test(match[0]));
      })
      .map((file) => path.relative(repoRoot, file))
      .sort();

    expect(publishers).toEqual(allowed);
  });

  it("does not use morphology effect-tag gating in morphology steps or tags", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
      path.join(repoRoot, "src/recipes/standard/tags.ts"),
    ];

    const files = roots.flatMap((candidate) => {
      try {
        const stat = statSync(candidate);
        if (stat.isDirectory()) {
          return listFilesRecursive(candidate).filter((file) => file.endsWith(".ts"));
        }
        return [candidate];
      } catch {
        return [];
      }
    });

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("landmassApplied");
      expect(text).not.toContain("coastlinesApplied");
      expect(text).not.toContain("effect:engine.landmassApplied");
      expect(text).not.toContain("effect:engine.coastlinesApplied");
    }
  });

  it("does not use morphology effect-tag gating in migrated consumer contracts", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const migratedContracts: Array<{
      file: string;
      mustRequire: "topography";
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
    ];

    for (const { file, mustRequire } of migratedContracts) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("M4_EFFECT_TAGS.engine.coastlinesApplied");
      expect(text).not.toContain("M4_EFFECT_TAGS.engine.landmassApplied");

      if (mustRequire === "topography") {
        expect(text).toContain("morphologyArtifacts.topography");
      }
    }
  });
});
