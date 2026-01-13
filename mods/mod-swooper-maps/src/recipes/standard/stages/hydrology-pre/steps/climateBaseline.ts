import { logElevationSummary, markLandmassId, resolveLandmassIds, syncHeightfield } from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { getStandardRuntime } from "../../../runtime.js";
import { hydrologyPreArtifacts } from "../artifacts.js";
import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/index.js";
import ClimateBaselineStepContract from "./climateBaseline.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectedSize(dimensions: MapDimensions): number {
  return Math.max(0, (dimensions.width | 0) * (dimensions.height | 0));
}

function validateTypedArray(
  errors: ArtifactValidationIssue[],
  label: string,
  value: unknown,
  ctor: { new (...args: any[]): { length: number } },
  expectedLength?: number
): value is { length: number } {
  if (!(value instanceof ctor)) {
    errors.push({ message: `Expected ${label} to be ${ctor.name}.` });
    return false;
  }
  if (expectedLength != null && value.length !== expectedLength) {
    errors.push({
      message: `Expected ${label} length ${expectedLength} (received ${value.length}).`,
    });
  }
  return true;
}

function validateClimateFieldBuffer(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing climate field buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { rainfall?: unknown; humidity?: unknown };
  validateTypedArray(errors, "climate.rainfall", candidate.rainfall, Uint8Array, size);
  validateTypedArray(errors, "climate.humidity", candidate.humidity, Uint8Array, size);
  return errors;
}

export default createStep(ClimateBaselineStepContract, {
  artifacts: implementArtifacts([hydrologyPreArtifacts.climateField], {
    climateField: {
      validate: (value, context) => validateClimateFieldBuffer(value, context.dimensions),
    },
  }),
  run: (context, config, _ops, deps) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const landmassIds = resolveLandmassIds(context.adapter);

    context.adapter.recalculateAreas();
    context.adapter.buildElevation();

    const westRestamped = markLandmassId(
      runtime.westContinent,
      landmassIds.WEST,
      context.adapter
    );
    const eastRestamped = markLandmassId(
      runtime.eastContinent,
      landmassIds.EAST,
      context.adapter
    );
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "landmass.regionIds.refresh",
        westRestamped,
        eastRestamped,
        ids: { west: landmassIds.WEST, east: landmassIds.EAST },
      }));
    }

    syncHeightfield(context);
    logElevationSummary(context.trace, context.adapter, width, height, "post-buildElevation");
    applyClimateBaseline(width, height, context, config.climate);
    deps.artifacts.climateField.publish(context, context.buffers.climate);
  },
});
