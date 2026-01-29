import { computeSampleStep, ctxRandom, ctxRandomLabel, renderAsciiGrid } from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import LandmassPlatesStepContract from "./landmassPlates.contract.js";
import { MORPHOLOGY_SEA_LEVEL_TARGET_WATER_PERCENT_DELTA } from "@mapgen/domain/morphology/shared/knob-multipliers.js";
import type { MorphologySeaLevelKnob } from "@mapgen/domain/morphology/shared/knobs.js";

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
    seaLevel?: unknown;
    landMask?: unknown;
    bathymetry?: unknown;
  };
  validateTypedArray(errors, "topography.elevation", candidate.elevation, Int16Array, size);
  if (typeof candidate.seaLevel !== "number" || !Number.isFinite(candidate.seaLevel)) {
    errors.push({ message: "Expected topography.seaLevel to be a finite number." });
  }
  validateTypedArray(errors, "topography.landMask", candidate.landMask, Uint8Array, size);
  validateTypedArray(errors, "topography.bathymetry", candidate.bathymetry, Int16Array, size);
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

function roundHalfAwayFromZero(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

function clampInt16(value: number): number {
  if (value > 32767) return 32767;
  if (value < -32768) return -32768;
  return value;
}

function clampNumber(value: number, bounds: { min: number; max?: number }): number {
  if (!Number.isFinite(value)) return bounds.min;
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, value));
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
  normalize: (config, ctx) => {
    const { seaLevel } = ctx.knobs as Readonly<{ seaLevel?: MorphologySeaLevelKnob }>;
    const delta = MORPHOLOGY_SEA_LEVEL_TARGET_WATER_PERCENT_DELTA[seaLevel ?? "earthlike"] ?? 0;

    const seaLevelSelection =
      config.seaLevel.strategy === "default"
        ? {
            ...config.seaLevel,
            config: {
              ...config.seaLevel.config,
              targetWaterPercent: clampNumber((config.seaLevel.config.targetWaterPercent ?? 0) + delta, {
                min: 0,
                max: 100,
              }),
            },
          }
        : config.seaLevel;

    return { ...config, seaLevel: seaLevelSelection };
  },
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const crustTiles = deps.artifacts.foundationCrustTiles.read(context);
    const { width, height } = context.dimensions;
    const stepId = `${LandmassPlatesStepContract.phase}/${LandmassPlatesStepContract.id}`;

    const substrate = ops.substrate(
      {
        width,
        height,
        upliftPotential: plates.upliftPotential,
        riftPotential: plates.riftPotential,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        crustType: crustTiles.type,
        crustAge: crustTiles.age,
      },
      config.substrate
    );

    const baseTopography = ops.baseTopography(
      {
        width,
        height,
        crustBaseElevation: crustTiles.baseElevation,
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
        crustType: crustTiles.type,
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

    const seaLevelValue = seaLevel.seaLevel;
    const waterElevation = clampInt16(Math.floor(seaLevelValue));
    const landElevation = clampInt16(Math.floor(seaLevelValue) + 1);
    for (let i = 0; i < context.buffers.heightfield.elevation.length; i++) {
      const isLand = context.buffers.heightfield.landMask[i] === 1;
      const current = context.buffers.heightfield.elevation[i] ?? 0;
      if (isLand) {
        if (current <= seaLevelValue) context.buffers.heightfield.elevation[i] = landElevation;
      } else {
        if (current > seaLevelValue) context.buffers.heightfield.elevation[i] = waterElevation;
      }
    }

    const bathymetry = new Int16Array(Math.max(0, (width | 0) * (height | 0)));
    for (let i = 0; i < bathymetry.length; i++) {
      const elevationMeters = context.buffers.heightfield.elevation[i] ?? 0;
      const isLand = context.buffers.heightfield.landMask[i] === 1;
      if (isLand) {
        bathymetry[i] = 0;
        continue;
      }
      const delta = Math.min(0, elevationMeters - seaLevelValue);
      bathymetry[i] = clampInt16(roundHalfAwayFromZero(delta));
    }

    const topography = {
      elevation: context.buffers.heightfield.elevation,
      seaLevel: seaLevelValue,
      landMask: context.buffers.heightfield.landMask,
      bathymetry,
    };

    context.trace.event(() => ({
      kind: "morphology.landmassPlates.summary",
      landTiles: stats.landCount,
      waterTiles: stats.waterCount,
      elevationMin: stats.minElevation,
      elevationMax: stats.maxElevation,
      seaLevel: seaLevelValue,
    }));
    context.trace.event(() => {
      const sampleStep = computeSampleStep(width, height);
      const rows = renderAsciiGrid({
        width,
        height,
        sampleStep,
        cellFn: (x, y) => {
          const idx = y * width + x;
          const isLand = context.buffers.heightfield.landMask[idx] === 1;
          return { base: isLand ? "." : "~" };
        },
      });
      return {
        kind: "morphology.landmassPlates.ascii.landMask",
        sampleStep,
        legend: ".=land ~=water",
        rows,
      };
    });

    deps.artifacts.topography.publish(context, topography);
    deps.artifacts.substrate.publish(context, substrate);
  },
});
