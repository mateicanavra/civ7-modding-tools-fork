import type { FoundationMesh } from "./ops/compute-mesh/contract.js";
import type { FoundationPlateGraph } from "./ops/compute-plate-graph/contract.js";
import type { FoundationTectonics } from "./ops/compute-tectonics/contract.js";
import { BOUNDARY_TYPE } from "./constants.js";

const HEX_WIDTH = Math.sqrt(3);
const HEX_HEIGHT = 1.5;
const HALF_HEX_HEIGHT = HEX_HEIGHT / 2;

function projectToHexSpace(x: number, y: number): { px: number; py: number } {
  const px = x * HEX_WIDTH;
  const py = y * HEX_HEIGHT + ((Math.floor(x) & 1) ? HALF_HEX_HEIGHT : 0);
  return { px, py };
}

function hexDistanceSq(
  a: { px: number; py: number },
  b: { px: number; py: number }
): number {
  const dx = a.px - b.px;
  const dy = a.py - b.py;
  return dx * dx + dy * dy;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value))) | 0;
}

function clampInt8(value: number): number {
  return Math.max(-127, Math.min(127, Math.round(value))) | 0;
}

interface HexNeighbor {
  x: number;
  y: number;
  i: number;
}

function getHexNeighbors(x: number, y: number, width: number, height: number): HexNeighbor[] {
  const neighbors: HexNeighbor[] = [];
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, 1],
        [1, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
      ];

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    const wrappedX = ((nx % width) + width) % width;
    if (ny >= 0 && ny < height) {
      neighbors.push({ x: wrappedX, y: ny, i: ny * width + wrappedX });
    }
  }

  return neighbors;
}

function computeDistanceField(
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
    const i = queue[head++];
    const d = distance[i];
    if (d >= maxDistance) continue;

    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);

    for (const n of neighbors) {
      if (distance[n.i] > d + 1) {
        distance[n.i] = d + 1;
        queue.push(n.i);
      }
    }
  }

  return distance;
}

function summarizeBoundaryCoverage(
  isBoundary: Uint8Array,
  boundaryCloseness: Uint8Array
): {
  boundaryTileShare: number;
  boundaryInfluenceShare: number;
  avgCloseness: number;
  avgInfluenceCloseness: number;
  maxCloseness: number;
  boundaryTiles: number;
  influencedTiles: number;
  totalTiles: number;
} {
  const size = isBoundary.length || 1;
  let boundaryTiles = 0;
  let influencedTiles = 0;
  let closenessSum = 0;
  let closenessInfluencedSum = 0;
  let maxCloseness = 0;

  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) boundaryTiles++;
    const c = boundaryCloseness[i] | 0;
    if (c > 0) influencedTiles++;
    closenessSum += c;
    if (c > 0) closenessInfluencedSum += c;
    if (c > maxCloseness) maxCloseness = c;
  }

  return {
    boundaryTileShare: boundaryTiles / size,
    boundaryInfluenceShare: influencedTiles / size,
    avgCloseness: closenessSum / size,
    avgInfluenceCloseness: influencedTiles > 0 ? closenessInfluencedSum / influencedTiles : 0,
    maxCloseness,
    boundaryTiles,
    influencedTiles,
    totalTiles: size,
  };
}

export function projectPlatesFromModel(input: {
  width: number;
  height: number;
  mesh: FoundationMesh;
  plateGraph: FoundationPlateGraph;
  tectonics: FoundationTectonics;
  boundaryInfluenceDistance: number;
  boundaryDecay: number;
  movementScale: number;
  rotationScale: number;
}): {
  plates: {
    id: Int16Array;
    boundaryCloseness: Uint8Array;
    boundaryType: Uint8Array;
    tectonicStress: Uint8Array;
    upliftPotential: Uint8Array;
    riftPotential: Uint8Array;
    shieldStability: Uint8Array;
    movementU: Int8Array;
    movementV: Int8Array;
    rotation: Int8Array;
  };
  diagnostics: { boundaryStats: ReturnType<typeof summarizeBoundaryCoverage> };
} {
  const width = input.width | 0;
  const height = input.height | 0;
  const size = Math.max(0, width * height);
  const mesh = input.mesh;
  const plateGraph = input.plateGraph;
  const tectonics = input.tectonics;

  const cellCount = mesh.cellCount | 0;
  const meshHexX = new Float32Array(cellCount);
  const meshHexY = new Float32Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    const hex = projectToHexSpace(mesh.siteX[i] ?? 0, mesh.siteY[i] ?? 0);
    meshHexX[i] = Math.fround(hex.px);
    meshHexY[i] = Math.fround(hex.py);
  }

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
  const movementU = new Int8Array(size);
  const movementV = new Int8Array(size);
  const rotation = new Int8Array(size);

  const tileToCell = new Int32Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const tileHex = projectToHexSpace(x + 0.5, y + 0.5);

      let bestCell = 0;
      let bestDist = Infinity;
      for (let c = 0; c < cellCount; c++) {
        const dist = hexDistanceSq(tileHex, { px: meshHexX[c] ?? 0, py: meshHexY[c] ?? 0 });
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = c;
        }
      }

      tileToCell[i] = bestCell;
      const plate = plateGraph.cellToPlate[bestCell] ?? 0;
      plateId[i] = plate;

      const plateIndex = plate >= 0 && plate < plateGraph.plates.length ? plate : 0;
      movementU[i] = plateMovementU[plateIndex] ?? 0;
      movementV[i] = plateMovementV[plateIndex] ?? 0;
      rotation[i] = plateRotation[plateIndex] ?? 0;
    }
  }

  const isBoundary = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const myPlate = plateId[i];
      const neighbors = getHexNeighbors(x, y, width, height);
      for (const n of neighbors) {
        if (plateId[n.i] !== myPlate) {
          isBoundary[i] = 1;
          break;
        }
      }
    }
  }

  const maxDistance = Math.max(1, input.boundaryInfluenceDistance | 0);
  const distanceField = computeDistanceField(isBoundary, width, height, maxDistance + 1);
  const decay = input.boundaryDecay;

  for (let i = 0; i < size; i++) {
    const cellId = tileToCell[i] ?? 0;
    const tectonicBoundary = tectonics.boundaryType[cellId] ?? BOUNDARY_TYPE.none;
    boundaryType[i] = isBoundary[i] ? tectonicBoundary : BOUNDARY_TYPE.none;

    const dist = distanceField[i];
    if (dist >= maxDistance) {
      boundaryCloseness[i] = 0;
    } else {
      boundaryCloseness[i] = clampByte(Math.exp(-dist * decay) * 255);
    }

    upliftPotential[i] = tectonics.upliftPotential[cellId] ?? 0;
    riftPotential[i] = tectonics.riftPotential[cellId] ?? 0;
    const shear = tectonics.shearStress[cellId] ?? 0;
    const stress = Math.max(upliftPotential[i], riftPotential[i], shear);
    tectonicStress[i] = clampByte(stress);
    shieldStability[i] = 255 - boundaryCloseness[i];
  }

  const diagnostics = Object.freeze({
    boundaryStats: summarizeBoundaryCoverage(isBoundary, boundaryCloseness),
  });

  return {
    plates: Object.freeze({
      id: plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      movementU,
      movementV,
      rotation,
    }),
    diagnostics,
  } as const;
}
