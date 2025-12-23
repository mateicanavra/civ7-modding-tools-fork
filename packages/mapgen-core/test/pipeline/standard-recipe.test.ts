import { describe, expect, it } from "bun:test";
import { STANDARD_RECIPE_STEP_IDS } from "@mapgen/mods/standard/recipes/default.js";
import { M3_STAGE_DEPENDENCY_SPINE } from "@mapgen/pipeline/standard.js";

describe("standard recipe wiring", () => {
  it("covers every standard recipe step in the dependency spine", () => {
    const missing = STANDARD_RECIPE_STEP_IDS.filter(
      (stepId) => !(stepId in M3_STAGE_DEPENDENCY_SPINE)
    );
    expect(missing).toEqual([]);
  });

  it("avoids dependency spine entries that are not in the standard recipe", () => {
    const extras = Object.keys(M3_STAGE_DEPENDENCY_SPINE).filter(
      (stepId) => !STANDARD_RECIPE_STEP_IDS.includes(stepId as (typeof STANDARD_RECIPE_STEP_IDS)[number])
    );
    expect(extras).toEqual([]);
  });
});
