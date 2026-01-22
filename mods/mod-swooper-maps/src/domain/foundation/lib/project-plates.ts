import { forEachHexNeighborOddQ, projectOddqToHexSpace } from "@swooper/mapgen-core/lib/grid";
import { wrapAbsDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import type { FoundationMesh } from "../ops/compute-mesh/contract.js";
import type { FoundationCrust } from "../ops/compute-crust/contract.js";
import type { FoundationPlateGraph } from "../ops/compute-plate-graph/contract.js";
import type { FoundationTectonics } from "../ops/compute-tectonics/contract.js";
import { BOUNDARY_TYPE } from "../constants.js";

function hexDistanceSq(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  wrapWidth: number
): number {
  const dx = wrapAbsDeltaPeriodic(ax - bx, wrapWidth);
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value))) | 0;
}

function clampInt8(value: number): number {
  return Math.max(-127, Math.min(127, Math.round(value))) | 0;
}

function computeHexWrappedDistanceField(
  isBoundary: Uint8Array,
  width: number,
  height: number,
  maxDistance: number
): Uint8Array {
  const size = width * height;
  const distance = new Uint8Array(size);
  distance.fill(255);

  const queue: number[] = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      distance[i] = 0;
      queue.push(i);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    const d = distance[i]!;
    if (d >= maxDistance) continue;

    const x = i % width;
    const y = Math.floor(i / width);
    forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
      const ni = ny * width + nx;
      if (distance[ni]! > d + 1) {
        distance[ni] = (d + 1) as number;
        queue.push(ni);
      }
    });
  }

  return distance;
}

export function projectPlatesFromModel(input: {
  width: number;
  height: number;
  mesh: FoundationMesh;
  crust: FoundationCrust;
  plateGraph: FoundationPlateGraph;
  tectonics: FoundationTectonics;
  boundaryInfluenceDistance: number;
  boundaryDecay: number;
  movementScale: number;
  rotationScale: number;
}): {
  tileToCellIndex: Int32Array;
  crustTiles: {
    type: Uint8Array;
    age: Uint8Array;
  };
  plates: {
    id: Int16Array;
    boundaryCloseness: Uint8Array;
    boundaryType: Uint8Array;
    tectonicStress: Uint8Array;
    upliftPotential: Uint8Array;
    riftPotential: Uint8Array;
    shieldStability: Uint8Array;
    volcanism: Uint8Array;
    movementU: Int8Array;
    movementV: Int8Array;
    rotation: Int8Array;
  };
} {
  const width = input.width | 0;
  const height = input.height | 0;
  const size = Math.max(0, width * height);
  const mesh = input.mesh;
  const crust = input.crust;
  const plateGraph = input.plateGraph;
  const tectonics = input.tectonics;

  const cellCount = mesh.cellCount | 0;
  const wrapWidth = mesh.wrapWidth;
  const meshHexX = mesh.siteX;
  const meshHexY = mesh.siteY;

  const plateMovementU = new Int8Array(plateGraph.plates.length);
  const plateMovementV = new Int8Array(plateGraph.plates.length);
  const plateRotation = new Int8Array(plateGraph.plates.length);
  for (let p = 0; p < plateGraph.plates.length; p++) {
    const plate = plateGraph.plates[p]!;
    plateMovementU[p] = clampInt8((plate.velocityX ?? 0) * input.movementScale);
    plateMovementV[p] = clampInt8((plate.velocityY ?? 0) * input.movementScale);
    plateRotation[p] = clampInt8((plate.rotation ?? 0) * input.rotationScale);
  }

  const plateId = new Int16Array(size);
  const boundaryCloseness = new Uint8Array(size);
  const boundaryType = new Uint8Array(size);
  const tectonicStress = new Uint8Array(size);
  const upliftPotential = new Uint8Array(size);
  const riftPotential = new Uint8Array(size);
  const shieldStability = new Uint8Array(size);
  const volcanism = new Uint8Array(size);
  const movementU = new Int8Array(size);
  const movementV = new Int8Array(size);
  const rotation = new Int8Array(size);

  const tileToCellIndex = new Int32Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const tileHex = projectOddqToHexSpace(x, y);

      let bestCell = 0;
      let bestDist = Infinity;
      for (let c = 0; c < cellCount; c++) {
        const dist = hexDistanceSq(tileHex.x, tileHex.y, meshHexX[c] ?? 0, meshHexY[c] ?? 0, wrapWidth);
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = c;
        }
      }

      tileToCellIndex[i] = bestCell;
      const plate = plateGraph.cellToPlate[bestCell] ?? 0;
      plateId[i] = plate;

      const plateIndex = plate >= 0 && plate < plateGraph.plates.length ? plate : 0;
      movementU[i] = plateMovementU[plateIndex] ?? 0;
      movementV[i] = plateMovementV[plateIndex] ?? 0;
      rotation[i] = plateRotation[plateIndex] ?? 0;
    }
  }

  const crustType = new Uint8Array(size);
  const crustAge = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const cellId = tileToCellIndex[i] ?? 0;
    crustType[i] = crust.type[cellId] ?? 0;
    crustAge[i] = crust.age[cellId] ?? 0;
  }

  const isBoundary = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const myPlate = plateId[i]!;
      let boundary = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (plateId[ni] !== myPlate) boundary = true;
      });
      isBoundary[i] = boundary ? 1 : 0;
    }
  }

  const maxDistance = Math.max(1, input.boundaryInfluenceDistance | 0);
  const distanceField = computeHexWrappedDistanceField(isBoundary, width, height, maxDistance + 1);
  const decay = input.boundaryDecay;

  for (let i = 0; i < size; i++) {
    const cellId = tileToCellIndex[i] ?? 0;
    const tectonicBoundary = tectonics.boundaryType[cellId] ?? BOUNDARY_TYPE.none;
    boundaryType[i] = isBoundary[i] ? tectonicBoundary : BOUNDARY_TYPE.none;

    const dist = distanceField[i]!;
    if (dist >= maxDistance) {
      boundaryCloseness[i] = 0;
    } else {
      boundaryCloseness[i] = clampByte(Math.exp(-dist * decay) * 255);
    }

    upliftPotential[i] = tectonics.upliftPotential[cellId] ?? 0;
    riftPotential[i] = tectonics.riftPotential[cellId] ?? 0;
    const shear = tectonics.shearStress[cellId] ?? 0;
    const stress = Math.max(upliftPotential[i]!, riftPotential[i]!, shear);
    tectonicStress[i] = clampByte(stress);
    shieldStability[i] = 255 - boundaryCloseness[i]!;
    volcanism[i] = clampByte(tectonics.volcanism[cellId] ?? 0);
  }

  return {
    tileToCellIndex,
    crustTiles: {
      type: crustType,
      age: crustAge,
    },
    plates: {
      id: plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      volcanism,
      movementU,
      movementV,
      rotation,
    },
  } as const;
}
