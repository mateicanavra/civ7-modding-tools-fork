import type { MapDimensions } from "@civ7/adapter";
import {
  createFoundationContext,
  ctxRandom,
  validateFoundationConfigArtifact,
  validateFoundationDiagnosticsArtifact,
  validateFoundationDynamicsArtifact,
  validateFoundationPlatesArtifact,
  validateFoundationSeedArtifact,
  validateFoundationContext,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import FoundationStepContract from "./foundation.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function wrapFoundationValidate(
  value: unknown,
  dimensions: MapDimensions,
  validator: (value: unknown, dims: MapDimensions) => void
): ArtifactValidationIssue[] {
  try {
    validator(value, dimensions);
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}

function wrapFoundationValidateNoDims(
  value: unknown,
  validator: (value: unknown) => void
): ArtifactValidationIssue[] {
  try {
    validator(value);
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}

export default createStep(FoundationStepContract, {
  artifacts: implementArtifacts(
    [
      foundationArtifacts.plates,
      foundationArtifacts.dynamics,
      foundationArtifacts.seed,
      foundationArtifacts.diagnostics,
      foundationArtifacts.config,
    ],
    {
      foundationPlates: {
        validate: (value, context) =>
          wrapFoundationValidate(value, context.dimensions, validateFoundationPlatesArtifact),
      },
      foundationDynamics: {
        validate: (value, context) =>
          wrapFoundationValidate(value, context.dimensions, validateFoundationDynamicsArtifact),
      },
      foundationSeed: {
        validate: (value, context) =>
          wrapFoundationValidate(value, context.dimensions, validateFoundationSeedArtifact),
      },
      foundationDiagnostics: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateFoundationDiagnosticsArtifact),
      },
      foundationConfig: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateFoundationConfigArtifact),
      },
    }
  ),
  normalize: (config) => ({
    ...config,
    computePlates: { strategy: "default" as const, config: config.foundation },
    computeDynamics: { strategy: "default" as const, config: config.foundation },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const size = Math.max(0, width * height) | 0;
    if (size <= 0) throw new Error("[Foundation] Invalid map dimensions.");

    const directionality = context.env.directionality;
    if (!directionality) {
      throw new Error("[Foundation] Missing env.directionality.");
    }

    const { adapter } = context;
    if (typeof adapter.getVoronoiUtils !== "function") {
      throw new Error("[Foundation] Adapter missing getVoronoiUtils.");
    }
    if (typeof adapter.getLatitude !== "function") {
      throw new Error("[Foundation] Adapter missing getLatitude.");
    }
    if (typeof adapter.isWater !== "function") {
      throw new Error("[Foundation] Adapter missing isWater.");
    }

    const latitudeByRow = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      latitudeByRow[y] = adapter.getLatitude(0, y);
    }

    const isWaterMask = new Uint8Array(size);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        isWaterMask[i] = adapter.isWater(x, y) ? 1 : 0;
      }
    }

    const rng = (max: number, label = "Foundation") => ctxRandom(context, label, max);

    const platesResult = ops.computePlates(
      {
        width,
        height,
        directionality,
        rng,
        voronoiUtils: adapter.getVoronoiUtils(),
        trace: context.trace,
      },
      config.computePlates
    );

    const dynamicsResult = ops.computeDynamics(
      {
        width,
        height,
        latitudeByRow,
        isWaterMask,
        rng,
      },
      config.computeDynamics
    );

    const foundationContext = createFoundationContext(
      {
        plates: platesResult.plates,
        dynamics: dynamicsResult.dynamics,
        plateSeed: platesResult.plateSeed,
        diagnostics: platesResult.diagnostics,
      },
      {
        dimensions: context.dimensions,
        config: {
          seed: config.foundation.seed as Record<string, unknown>,
          plates: config.foundation.plates as Record<string, unknown>,
          dynamics: config.foundation.dynamics as Record<string, unknown>,
          surface: {},
          policy: {},
          diagnostics: {},
        },
      }
    );

    validateFoundationContext(foundationContext, context.dimensions);
    deps.artifacts.foundationPlates.publish(context, foundationContext.plates);
    deps.artifacts.foundationDynamics.publish(context, foundationContext.dynamics);
    if (!foundationContext.plateSeed) {
      throw new Error("[Foundation] Missing plate seed snapshot.");
    }
    deps.artifacts.foundationSeed.publish(context, foundationContext.plateSeed);
    deps.artifacts.foundationDiagnostics.publish(context, foundationContext.diagnostics);
    deps.artifacts.foundationConfig.publish(context, foundationContext.config);
  },
});
