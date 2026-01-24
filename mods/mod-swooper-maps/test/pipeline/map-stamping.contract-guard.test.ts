import { describe, expect, it } from "bun:test";

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { M10_EFFECT_TAGS } from "../../src/recipes/standard/tags.js";

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

describe("map stamping contract guardrails", () => {
  it("does not allow physics contracts to require map artifacts or effects", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/recipes/standard/stages/foundation"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-climate-baseline"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-hydrography"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-climate-refine"),
      path.join(repoRoot, "src/recipes/standard/stages/ecology"),
    ];

    const contractFiles = roots.flatMap((candidate) => {
      try {
        const stat = statSync(candidate);
        if (stat.isDirectory()) {
          return listFilesRecursive(candidate).filter((file) => file.endsWith("contract.ts"));
        }
        return [candidate];
      } catch {
        return [];
      }
    });

    expect(contractFiles.length).toBeGreaterThan(0);

    for (const file of contractFiles) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("artifact:map.");
      expect(text).not.toContain("effect:map.");
      expect(text).not.toContain("M10_EFFECT_TAGS.map");
    }
  });

  it("only calls TerrainBuilder.buildElevation in the dedicated build-elevation step", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const stagesRoot = path.join(repoRoot, "src/recipes/standard/stages");
    const files = listFilesRecursive(stagesRoot).filter((file) => file.endsWith(".ts"));

    const callers = files.filter((file) => {
      const text = readFileSync(file, "utf8");
      return /adapter\.buildElevation\s*\(/.test(text);
    });

    callers.sort();
    expect(callers).toEqual([path.join(stagesRoot, "map-morphology/steps/buildElevation.ts")]);

    const contractText = readFileSync(
      path.join(stagesRoot, "map-morphology/steps/buildElevation.contract.ts"),
      "utf8"
    );
    expect(contractText).toContain("M10_EFFECT_TAGS.map.elevationBuilt");
  });

  it("does not allow physics stage code to call engine elevation/cliff reads", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const physicsRoots = [
      path.join(repoRoot, "src/recipes/standard/stages/foundation"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-pre"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-mid"),
      path.join(repoRoot, "src/recipes/standard/stages/morphology-post"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-climate-baseline"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-hydrography"),
      path.join(repoRoot, "src/recipes/standard/stages/hydrology-climate-refine"),
      path.join(repoRoot, "src/recipes/standard/stages/ecology"),
    ];

    const files = physicsRoots.flatMap((candidate) => {
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
      expect(text).not.toMatch(/adapter\.getElevation\s*\(/);
      expect(text).not.toMatch(/adapter\.isCliffCrossing\s*\(/);
    }
  });

  it("does not introduce artifact:map.realized.* anywhere in source", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const workspaceRoot = path.resolve(repoRoot, "..", "..");
    const roots = [
      path.join(repoRoot, "src"),
      path.join(workspaceRoot, "packages/mapgen-core/src"),
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
      expect(text).not.toContain("artifact:map.realized.");
    }
  });

  it("uses the expected naming convention for map effects", () => {
    const effectPattern = /^effect:map\.[a-z][a-zA-Z0-9]*(Plotted|Built)$/;
    const effects = Object.values(M10_EFFECT_TAGS.map);

    expect(effects.length).toBeGreaterThan(0);
    for (const effect of effects) {
      expect(effect).toMatch(effectPattern);
    }
  });
});
