import { describe, expect, it } from "bun:test";

import standardRecipe from "../src/recipes/standard/recipe.js";
import { STANDARD_TAG_DEFINITIONS } from "../src/recipes/standard/tags.js";

const baseSettings = {
  seed: 42,
  dimensions: { width: 2, height: 2 },
  latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
};

describe("standard recipe composition", () => {
  it("keeps tag definitions unique", () => {
    const ids = STANDARD_TAG_DEFINITIONS.map((tag) => tag.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses the expected stage ordering", () => {
    const expectedStages = [
      "foundation",
      "morphology-pre",
      "narrative-pre",
      "morphology-mid",
      "narrative-mid",
      "morphology-post",
      "hydrology-pre",
      "narrative-swatches",
      "hydrology-core",
      "narrative-post",
      "hydrology-post",
      "ecology",
      "placement",
    ];
    const observedStages: string[] = [];

    for (const step of standardRecipe.recipe.steps) {
      const parts = step.id.split(".");
      const stageId = parts[2] ?? "";
      if (observedStages.at(-1) !== stageId) {
        observedStages.push(stageId);
      }
    }

    expect(observedStages).toEqual(expectedStages);
  });

  it("compiles without missing tag errors", () => {
    expect(() => standardRecipe.compile(baseSettings)).not.toThrow();
  });
});
