import type { MapDimensions } from "@civ7/adapter";
import {
  validateFoundationConfigArtifact,
  validateFoundationDiagnosticsArtifact,
  validateFoundationDynamicsArtifact,
  validateFoundationPlatesArtifact,
  validateFoundationSeedArtifact,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { runFoundationStage } from "../producer.js";
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
  run: (context, config, _ops, deps) => {
    const foundationContext = runFoundationStage(context, config.foundation);
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
