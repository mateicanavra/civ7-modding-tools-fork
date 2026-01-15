import {
  FLAT_TERRAIN,
  OCEAN_TERRAIN,
  ctxRandom,
  ctxRandomLabel,
  logLandmassAscii,
  writeHeightfield,
} from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import LandmassPlatesStepContract from "./landmassPlates.contract.js";

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

function validateHeightfieldBuffer(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing heightfield buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as {
    elevation?: unknown;
    terrain?: unknown;
    landMask?: unknown;
  };
  validateTypedArray(errors, "topography.elevation", candidate.elevation, Int16Array, size);
  validateTypedArray(errors, "topography.terrain", candidate.terrain, Uint8Array, size);
  validateTypedArray(errors, "topography.landMask", candidate.landMask, Uint8Array, size);
  return errors;
}

function validateSubstrateBuffer(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing substrate buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { erodibilityK?: unknown; sedimentDepth?: unknown };
  validateTypedArray(errors, "substrate.erodibilityK", candidate.erodibilityK, Float32Array, size);
  validateTypedArray(errors, "substrate.sedimentDepth", candidate.sedimentDepth, Float32Array, size);
  return errors;
}

function applyBaseTerrain(
  width: number,
  height: number,
  elevation: Int16Array,
  landMask: Uint8Array,
  context: Parameters<typeof writeHeightfield>[0]
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isLand = landMask[i] === 1;
      const terrain = isLand ? FLAT_TERRAIN : OCEAN_TERRAIN;
      writeHeightfield(context, x, y, { terrain, isLand, elevation: elevation[i] ?? 0 });
    }
  }
}

export default createStep(LandmassPlatesStepContract, {
  artifacts: implementArtifacts(LandmassPlatesStepContract.artifacts!.provides!, {
    topography: {
      validate: (value, context) => validateHeightfieldBuffer(value, context.dimensions),
    },
    substrate: {
      validate: (value, context) => validateSubstrateBuffer(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const stepId = `${LandmassPlatesStepContract.phase}/${LandmassPlatesStepContract.id}`;

    const substrate = ops.substrate(
      {
        width,
        height,
        upliftPotential: plates.upliftPotential,
        riftPotential: plates.riftPotential,
      },
      config.substrate
    );

    const baseTopography = ops.baseTopography(
      {
        width,
        height,
        boundaryCloseness: plates.boundaryCloseness,
        upliftPotential: plates.upliftPotential,
        riftPotential: plates.riftPotential,
        rngSeed: ctxRandom(context, ctxRandomLabel(stepId, "morphology/compute-base-topography"), 2_147_483_647),
      },
      config.baseTopography
    );

    const seaLevel = ops.seaLevel(
      {
        width,
        height,
        elevation: baseTopography.elevation,
        boundaryCloseness: plates.boundaryCloseness,
        upliftPotential: plates.upliftPotential,
        rngSeed: ctxRandom(context, ctxRandomLabel(stepId, "morphology/compute-sea-level"), 2_147_483_647),
      },
      config.seaLevel
    );

    const landmask = ops.landmask(
      {
        width,
        height,
        elevation: baseTopography.elevation,
        seaLevel: seaLevel.seaLevel,
        boundaryCloseness: plates.boundaryCloseness,
      },
      config.landmask
    );

    applyBaseTerrain(width, height, baseTopography.elevation, landmask.landMask, context);

    context.adapter.validateAndFixTerrain();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();

    logLandmassAscii(context.trace, context.adapter, width, height);

    deps.artifacts.topography.publish(context, context.buffers.heightfield);
    deps.artifacts.substrate.publish(context, substrate);
  },
});
