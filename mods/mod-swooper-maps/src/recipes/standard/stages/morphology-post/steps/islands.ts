import {
  COAST_TERRAIN,
  FLAT_TERRAIN,
  ctxRandom,
  ctxRandomLabel,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  readOverlayCorridors,
  readOverlayMotifsHotspots,
  readOverlayMotifsMargins,
} from "../../../overlays.js";
import IslandsStepContract from "./islands.contract.js";

type HotspotTrail = { coords: Array<{ x: number; y: number }> };

type OverlayMasks = {
  seaLanes: Uint8Array;
  activeMargin: Uint8Array;
  passiveShelf: Uint8Array;
  hotspots: Uint8Array;
};

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

function fillMaskFromTrails(width: number, height: number, trails?: HotspotTrail[]): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (!trails) return mask;
  for (const trail of trails) {
    for (const coord of trail.coords ?? []) {
      const x = coord.x | 0;
      const y = coord.y | 0;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      mask[y * width + x] = 1;
    }
  }
  return mask;
}

function mergeMasks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const size = Math.min(a.length, b.length);
  const merged = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    merged[i] = a[i] || b[i] ? 1 : 0;
  }
  return merged;
}

function buildOverlayMasks(width: number, height: number, overlays: unknown): OverlayMasks {
  const margins = readOverlayMotifsMargins(overlays as any);
  const corridors = readOverlayCorridors(overlays as any);
  const hotspots = readOverlayMotifsHotspots(overlays as any);
  const hotspotPoints = fillMaskFromKeys(width, height, hotspots?.points);
  const hotspotTrails = fillMaskFromTrails(width, height, hotspots?.trails as HotspotTrail[] | undefined);
  return {
    seaLanes: fillMaskFromKeys(width, height, corridors?.seaLanes),
    activeMargin: fillMaskFromKeys(width, height, margins?.activeMargin),
    passiveShelf: fillMaskFromKeys(width, height, margins?.passiveShelf),
    hotspots: mergeMasks(hotspotPoints, hotspotTrails),
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

export default createStep(IslandsStepContract, {
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const overlays = deps.artifacts.overlays.read(context);
    const heightfield = context.buffers.heightfield;
    const stepId = `${IslandsStepContract.phase}/${IslandsStepContract.id}`;

    const masks = buildOverlayMasks(width, height, overlays);
    const fractal = buildFractalArray(context, width, height, 1, 5);

    const plan = ops.islands(
      {
        width,
        height,
        landMask: heightfield.landMask,
        seaLaneMask: masks.seaLanes,
        activeMarginMask: masks.activeMargin,
        passiveShelfMask: masks.passiveShelf,
        hotspotMask: masks.hotspots,
        fractal,
        rngSeed: ctxRandom(context, ctxRandomLabel(stepId, "morphology/plan-island-chains"), 2_147_483_647),
      },
      config.islands
    );

    for (const edit of plan.edits) {
      const index = edit.index | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const terrain = edit.kind === "peak" ? FLAT_TERRAIN : COAST_TERRAIN;
      const isLand = edit.kind === "peak";
      writeHeightfield(context, x, y, { terrain, isLand });
    }
  },
});
