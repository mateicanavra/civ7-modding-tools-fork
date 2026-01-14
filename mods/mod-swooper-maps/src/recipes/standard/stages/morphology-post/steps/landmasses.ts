import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import LandmassesStepContract from "./landmasses.contract.js";

const ERROR_PREFIX = "[Morphology landmasses]";

type LandmassSummary = Readonly<{
  id: number;
  tiles: number;
}>;

type LandmassesSnapshot = Readonly<{
  tileToLandmass: Int32Array;
  landmasses: LandmassSummary[];
  landTiles: number;
}>;

/**
 * Label connected land components from a hex land mask.
 */
function computeLandmasses(
  width: number,
  height: number,
  landMask: Uint8Array
): LandmassesSnapshot {
  const size = Math.max(0, width * height);
  if (landMask.length !== size) {
    throw new Error(
      `${ERROR_PREFIX} expected landMask length ${size} (received ${landMask.length}).`
    );
  }

  const tileToLandmass = new Int32Array(size);
  const landmasses: LandmassSummary[] = [];
  const queue = new Int32Array(size);
  let landTiles = 0;
  let nextId = 0;

  for (let idx = 0; idx < size; idx++) {
    if (landMask[idx] === 0 || tileToLandmass[idx] !== 0) continue;

    nextId += 1;
    let head = 0;
    let tail = 0;
    let count = 0;

    queue[tail++] = idx;
    tileToLandmass[idx] = nextId;

    while (head < tail) {
      const current = queue[head++];
      count += 1;
      const y = Math.floor(current / width);
      const x = current - y * width;

      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const nIdx = ny * width + nx;
        if (landMask[nIdx] === 0 || tileToLandmass[nIdx] !== 0) return;
        tileToLandmass[nIdx] = nextId;
        queue[tail++] = nIdx;
      });
    }

    landTiles += count;
    landmasses.push({ id: nextId, tiles: count });
  }

  return { tileToLandmass, landmasses, landTiles };
}

export default createStep(LandmassesStepContract, {
  artifacts: implementArtifacts([morphologyArtifacts.landmasses], {
    landmasses: {},
  }),
  run: (context, _config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const landMask = context.buffers?.heightfield?.landMask;
    if (!(landMask instanceof Uint8Array)) {
      throw new Error(`${ERROR_PREFIX} missing Uint8Array landMask buffer.`);
    }

    const snapshot = computeLandmasses(width, height, landMask);
    deps.artifacts.landmasses.publish(context, snapshot);
  },
});
