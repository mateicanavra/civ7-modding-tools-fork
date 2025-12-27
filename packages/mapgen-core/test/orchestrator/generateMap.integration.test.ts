import { describe, it, expect } from "bun:test";
import { bootstrap } from "@mapgen/bootstrap/entry.js";
import { runTaskGraphGeneration } from "@mapgen/index.js";
import { createMockAdapter } from "@civ7/adapter/mock";
import type { RecipeV1 } from "@mapgen/pipeline/execution-plan.js";
import { baseDefaultRecipe, baseMod } from "@mapgen/base/index.js";

/**
 * Minimal integration to pin the canonical config → execution plan path.
 *
 * We disable all stage execution via a recipe override to avoid layer dependencies
 * and supply a no-op adapter. The goal is to verify that generateMap() can run
 * end-to-end with schema-defaulted config, not to exercise the full layer pipeline.
 */
describe("integration: bootstrap → execution plan (stages disabled)", () => {
  const mapInfo = {
    GridWidth: 84,
    GridHeight: 54,
    MinLatitude: -80,
    MaxLatitude: 80,
    NumNaturalWonders: 0,
    LakeGenerationFrequency: 0,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };

  it("runs generateMap with schema defaults and no stage execution", () => {
    const adapter = createMockAdapter({
      width: 84,
      height: 54,
      mapSizeId: 1,
      mapInfo,
    });

    const config = bootstrap();
    const recipeOverride: RecipeV1 = {
      ...baseDefaultRecipe,
      steps: baseDefaultRecipe.steps.map((step) => ({
        ...step,
        enabled: false,
      })),
    };

    const result = runTaskGraphGeneration({
      mod: baseMod,
      mapGenConfig: config,
      orchestratorOptions: {
        adapter,
        logPrefix: "[TEST]",
        recipeOverride,
      },
    });

    expect(result.success).toBe(true);
  });
});
