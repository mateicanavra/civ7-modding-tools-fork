import { describe, expect, it } from "bun:test";

import { BASE_RECIPE_STEP_IDS, BASE_TAG_DEFINITIONS } from "@swooper/mapgen-core/base";
import standardRecipe from "../src/recipes/standard/recipe.js";
import { STANDARD_TAG_DEFINITIONS } from "../src/recipes/standard/tags.js";

const baseSettings = {
  seed: 42,
  dimensions: { width: 2, height: 2 },
  latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
  wrap: { wrapX: true, wrapY: false },
};

describe("standard recipe composition", () => {
  it("matches the legacy tag catalog", () => {
    const baseIds = BASE_TAG_DEFINITIONS.map((tag) => tag.id).sort();
    const standardIds = STANDARD_TAG_DEFINITIONS.map((tag) => tag.id).sort();

    expect(standardIds).toEqual(baseIds);
  });

  it("preserves the legacy step order", () => {
    const stepIds = standardRecipe.recipe.steps.map((step) => step.id.split(".").at(-1));
    expect(stepIds).toEqual([...BASE_RECIPE_STEP_IDS]);
  });

  it("compiles without missing tag errors", () => {
    expect(() => standardRecipe.compile(baseSettings)).not.toThrow();
  });
});
