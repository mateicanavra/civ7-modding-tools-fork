import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { mapArtifacts } from "../../../../map-artifacts.js";
import PlotLandmassRegionsStepContract from "./contract.js";

type RegionSlot = 0 | 1 | 2;

function computeWrappedIntervalCenter(west: number, east: number, width: number): number {
  if (width <= 0) return 0;
  const w = ((west % width) + width) % width;
  const e = ((east % width) + width) % width;
  if (w <= e) return Math.floor((w + e) / 2);
  const length = width - w + (e + 1);
  return (w + Math.floor(length / 2)) % width;
}

function resolveSlotByTile(input: {
  width: number;
  height: number;
  landMask: Uint8Array;
  landmassIdByTile: Int32Array;
  landmasses: ReadonlyArray<{ id: number; bbox: { west: number; east: number } }>;
}): Uint8Array {
  const { width, height, landMask, landmassIdByTile, landmasses } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  if (landMask.length !== size) {
    throw new Error(`Expected landMask length ${size} (received ${landMask.length}).`);
  }
  if (landmassIdByTile.length !== size) {
    throw new Error(`Expected landmassIdByTile length ${size} (received ${landmassIdByTile.length}).`);
  }

  const slotByLandmass = new Uint8Array(landmasses.length);
  for (const mass of landmasses) {
    const centerX = computeWrappedIntervalCenter(mass.bbox.west, mass.bbox.east, width);
    slotByLandmass[mass.id] = centerX < width / 2 ? 1 : 2;
  }

  const out = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if ((landMask[i] | 0) !== 1) {
      out[i] = 0;
      continue;
    }
    const landmassId = landmassIdByTile[i] ?? -1;
    if (landmassId < 0 || landmassId >= slotByLandmass.length) {
      out[i] = 0;
      continue;
    }
    out[i] = slotByLandmass[landmassId] ?? 0;
  }

  return out;
}

export default createStep(PlotLandmassRegionsStepContract, {
  artifacts: implementArtifacts(
    [
      mapArtifacts.projectionMeta,
      mapArtifacts.landmassRegionSlotByTile,
    ],
    {
      projectionMeta: {},
      landmassRegionSlotByTile: {},
    }
  ),
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const landmasses = deps.artifacts.landmasses.read(context);
    const { width, height } = context.dimensions;
    const slotByTile = resolveSlotByTile({
      width,
      height,
      landMask: topography.landMask as Uint8Array,
      landmassIdByTile: landmasses.landmassIdByTile as Int32Array,
      landmasses: landmasses.landmasses,
    });

    const westRegionId = context.adapter.getLandmassId("WEST");
    const eastRegionId = context.adapter.getLandmassId("EAST");
    const noneRegionId = context.adapter.getLandmassId("NONE");

    const size = Math.max(0, (width | 0) * (height | 0));
    for (let i = 0; i < size; i++) {
      const y = (i / width) | 0;
      const x = i - y * width;
      const slot = (slotByTile[i] ?? 0) as RegionSlot;
      const regionId = slot === 1 ? westRegionId : slot === 2 ? eastRegionId : noneRegionId;
      context.adapter.setLandmassRegionId(x, y, regionId);
    }

    deps.artifacts.projectionMeta.publish(context, {
      width,
      height,
      wrapX: true,
      wrapY: false,
    });
    deps.artifacts.landmassRegionSlotByTile.publish(context, { slotByTile });
  },
});
