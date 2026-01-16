import type { FeatureData } from "@civ7/adapter";
import {
  MOUNTAIN_TERRAIN,
  VOLCANO_FEATURE,
  ctxRandom,
  ctxRandomLabel,
  logVolcanoSummary,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { readOverlayMotifsHotspots } from "../../../overlays.js";
import VolcanoesStepContract from "./volcanoes.contract.js";

type HotspotTrail = { coords: Array<{ x: number; y: number }> };

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

export default createStep(VolcanoesStepContract, {
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;
    const stepId = `${VolcanoesStepContract.phase}/${VolcanoesStepContract.id}`;

    const hotspots = readOverlayMotifsHotspots(overlays as any);
    const hotspotPoints = fillMaskFromKeys(width, height, hotspots?.points);
    const hotspotTrails = fillMaskFromTrails(width, height, hotspots?.trails as HotspotTrail[] | undefined);
    const hotspotMask = mergeMasks(hotspotPoints, hotspotTrails);

    const plan = ops.volcanoes(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        shieldStability: plates.shieldStability,
        hotspotMask,
        rngSeed: ctxRandom(context, ctxRandomLabel(stepId, "morphology/plan-volcanoes"), 2_147_483_647),
      },
      config.volcanoes
    );

    for (const entry of plan.volcanoes) {
      const index = entry.index | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      writeHeightfield(context, x, y, { terrain: MOUNTAIN_TERRAIN, isLand: true });
      const featureData: FeatureData = { Feature: VOLCANO_FEATURE, Direction: -1, Elevation: 0 };
      context.adapter.setFeatureType(x, y, featureData);
    }

    const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
    logVolcanoSummary(context.trace, context.adapter, width, height, volcanoId);
  },
});
