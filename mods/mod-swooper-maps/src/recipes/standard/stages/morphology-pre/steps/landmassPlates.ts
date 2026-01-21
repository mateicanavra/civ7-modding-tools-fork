import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
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
    landMask?: unknown;
  };
  validateTypedArray(errors, "topography.elevation", candidate.elevation, Int16Array, size);
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

function applyBaseTerrainBuffers(
  width: number,
  height: number,
  elevation: Int16Array,
  landMask: Uint8Array,
  heightfield: { elevation: Int16Array; landMask: Uint8Array }
): { landCount: number; waterCount: number; minElevation: number; maxElevation: number } {
  const size = Math.max(0, (width | 0) * (height | 0));
  let landCount = 0;
  let waterCount = 0;
  let minElevation = 0;
  let maxElevation = 0;

  for (let i = 0; i < size; i++) {
    const nextElevation = elevation[i] ?? 0;
    const isLand = landMask[i] === 1;

    heightfield.elevation[i] = nextElevation | 0;
    heightfield.landMask[i] = isLand ? 1 : 0;

    if (isLand) landCount += 1;
    else waterCount += 1;

    if (i === 0 || nextElevation < minElevation) minElevation = nextElevation;
    if (i === 0 || nextElevation > maxElevation) maxElevation = nextElevation;
  }

  return { landCount, waterCount, minElevation, maxElevation };
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

    const stats = applyBaseTerrainBuffers(
      width,
      height,
      baseTopography.elevation,
      landmask.landMask,
      context.buffers.heightfield
    );
    context.trace.event(() => ({
      kind: "morphology.landmassPlates.summary",
      landTiles: stats.landCount,
      waterTiles: stats.waterCount,
      elevationMin: stats.minElevation,
      elevationMax: stats.maxElevation,
    }));

    deps.artifacts.topography.publish(context, context.buffers.heightfield);
    deps.artifacts.substrate.publish(context, substrate);
  },
});
