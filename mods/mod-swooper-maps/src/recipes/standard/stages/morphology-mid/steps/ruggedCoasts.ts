import type { MapDimensions } from "@civ7/adapter";
import {
  COAST_TERRAIN,
  FLAT_TERRAIN,
  OCEAN_TERRAIN,
  ctxRandom,
  ctxRandomLabel,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { readOverlayCorridors, readOverlayMotifsMargins } from "../../../overlays.js";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

type OverlayMasks = {
  seaLanes: Uint8Array;
  activeMargin: Uint8Array;
  passiveShelf: Uint8Array;
};

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

function validateCoastlineMetrics(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing coastline metrics." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { coastalLand?: unknown; coastalWater?: unknown };
  validateTypedArray(errors, "coastlineMetrics.coastalLand", candidate.coastalLand, Uint8Array, size);
  validateTypedArray(errors, "coastlineMetrics.coastalWater", candidate.coastalWater, Uint8Array, size);
  return errors;
}

function fillMaskFromKeys(width: number, height: number, keys: Set<string> | null | undefined): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (!keys) return mask;
  for (const key of keys) {
    const [xs, ys] = key.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    mask[y * width + x] = 1;
  }
  return mask;
}

function buildOverlayMasks(width: number, height: number, overlays: unknown): OverlayMasks {
  const margins = readOverlayMotifsMargins(overlays as any);
  const corridors = readOverlayCorridors(overlays as any);
  return {
    seaLanes: fillMaskFromKeys(width, height, corridors?.seaLanes),
    activeMargin: fillMaskFromKeys(width, height, margins?.activeMargin),
    passiveShelf: fillMaskFromKeys(width, height, margins?.passiveShelf),
  };
}

function buildFractalArray(
  context: Parameters<typeof writeHeightfield>[0],
  width: number,
  height: number,
  fractalId: number,
  grain: number
): Int16Array {
  const fractal = new Int16Array(width * height);
  if (context.adapter?.createFractal && context.adapter?.getFractalHeight) {
    context.adapter.createFractal(fractalId, width, height, grain, 0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        fractal[i] = context.adapter.getFractalHeight(fractalId, x, y) | 0;
      }
    }
  }
  return fractal;
}

export default createStep(RuggedCoastsStepContract, {
  artifacts: implementArtifacts(RuggedCoastsStepContract.artifacts!.provides!, {
    coastlineMetrics: {
      validate: (value, context) => validateCoastlineMetrics(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const heightfield = context.buffers.heightfield;
    const stepId = `${RuggedCoastsStepContract.phase}/${RuggedCoastsStepContract.id}`;

    const masks = buildOverlayMasks(width, height, overlays);
    const fractal = buildFractalArray(context, width, height, 1, 4);

    const result = ops.coastlines(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        seaLaneMask: masks.seaLanes,
        activeMarginMask: masks.activeMargin,
        passiveShelfMask: masks.passiveShelf,
        fractal,
        rngSeed: ctxRandom(
          context,
          ctxRandomLabel(stepId, "morphology/compute-coastline-metrics"),
          2_147_483_647
        ),
      },
      config.coastlines
    );

    const updatedLandMask = result.landMask;
    const coastMask = result.coastMask;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (coastMask[i] === 1) {
          writeHeightfield(context, x, y, { terrain: COAST_TERRAIN, isLand: false });
          continue;
        }
        const isLand = updatedLandMask[i] === 1;
        const currentIsLand = heightfield.landMask[i] === 1;
        if (isLand !== currentIsLand) {
          const terrain = isLand ? FLAT_TERRAIN : OCEAN_TERRAIN;
          writeHeightfield(context, x, y, { terrain, isLand });
        } else if (!isLand && heightfield.terrain[i] === COAST_TERRAIN) {
          writeHeightfield(context, x, y, { terrain: OCEAN_TERRAIN, isLand: false });
        }
      }
    }

    deps.artifacts.coastlineMetrics.publish(context, {
      coastalLand: result.coastalLand,
      coastalWater: result.coastalWater,
    });
  },
});
