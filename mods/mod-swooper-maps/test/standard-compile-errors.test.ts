import { describe, expect, it } from "bun:test";

import { Type, createStage } from "@swooper/mapgen-core/authoring";
import {
  RecipeCompileError,
  compileRecipeConfig,
} from "@swooper/mapgen-core/compiler/recipe-compile";

import standardRecipe, { compileOpsById } from "../src/recipes/standard/recipe.js";
import { steps as ecologySteps } from "../src/recipes/standard/stages/ecology/steps/index.js";

const baseSettings = {
  seed: 42,
  dimensions: { width: 2, height: 2 },
  latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
};

function expectCompileError(fn: () => void): RecipeCompileError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(RecipeCompileError);
    return error as RecipeCompileError;
  }
  throw new Error("Expected RecipeCompileError");
}

describe("standard recipe compile errors (ecology)", () => {
  it("flags unknown stage public keys", () => {
    const err = expectCompileError(() =>
      standardRecipe.compileConfig(baseSettings, {
        ecology: {
          extraField: {},
        },
      } as any)
    );

    expect(
      err.errors.some(
        (item) =>
          item.code === "config.invalid" && item.path.includes("/config/ecology/extraField")
      )
    ).toBe(true);
  });

  it("flags schema errors within ecology step configs", () => {
    const err = expectCompileError(() =>
      standardRecipe.compileConfig(baseSettings, {
        ecology: {
          biomes: {
            classify: 123,
          },
        },
      } as any)
    );

    expect(
      err.errors.some(
        (item) => item.code === "config.invalid" && item.path.includes("/config/ecology/biomes")
      )
    ).toBe(true);
  });

  it("flags unknown step ids returned by ecology stage compile", () => {
    const brokenStage = createStage({
      id: "ecology",
      knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
      public: Type.Object(
        {
          pedology: Type.Optional(ecologySteps.pedology.contract.schema),
        },
        { additionalProperties: false, default: {} }
      ),
      compile: ({ config }) => ({
        "unknown-step": config.pedology,
      }),
      steps: [ecologySteps.pedology],
    });

    const err = expectCompileError(() =>
      compileRecipeConfig({
        env: baseSettings,
        recipe: { stages: [brokenStage] },
        config: { ecology: { pedology: {} } },
        compileOpsById,
      })
    );

    expect(
      err.errors.some(
        (item) => item.code === "stage.unknown-step-id" && item.stepId === "unknown-step"
      )
    ).toBe(true);
  });
});
