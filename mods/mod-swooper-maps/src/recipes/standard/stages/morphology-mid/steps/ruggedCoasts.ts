import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { readOverlayCorridors, readOverlayMotifsMargins } from "../../../overlays.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";

type CoastlineMetrics = Readonly<{
  landTiles: number;
  waterTiles: number;
  coastlineTiles: number;
}>;

/**
 * Derive coastline tile counts from the land mask using hex adjacency.
 */
function computeCoastlineMetrics(
  width: number,
  height: number,
  landMask: Uint8Array
): CoastlineMetrics {
  const size = Math.max(0, width * height);
  if (landMask.length !== size) {
    throw new Error(
      `[Morphology] Expected landMask length ${size} (received ${landMask.length}).`
    );
  }

  let landTiles = 0;
  let waterTiles = 0;
  let coastlineTiles = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const isLand = landMask[idx] > 0;
      if (isLand) {
        landTiles++;
      } else {
        waterTiles++;
        continue;
      }

      let hasWaterNeighbor = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        if (hasWaterNeighbor) return;
        const nIdx = ny * width + nx;
        if (landMask[nIdx] === 0) hasWaterNeighbor = true;
      });
      if (hasWaterNeighbor) coastlineTiles++;
    }
  }

  return { landTiles, waterTiles, coastlineTiles };
}

export default createStep(RuggedCoastsStepContract, {
  artifacts: implementArtifacts([morphologyArtifacts.coastlineMetrics], {
    coastlineMetrics: {},
  }),
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const margins = readOverlayMotifsMargins(overlays);
    const corridors = readOverlayCorridors(overlays);
    addRuggedCoasts(width, height, context, config, plates, { margins, corridors });

    const landMask = context.buffers?.heightfield?.landMask;
    if (!landMask) {
      throw new Error("[Morphology] Missing heightfield landMask buffer.");
    }
    const metrics = computeCoastlineMetrics(width, height, landMask);
    deps.artifacts.coastlineMetrics.publish(context, metrics);
  },
});
