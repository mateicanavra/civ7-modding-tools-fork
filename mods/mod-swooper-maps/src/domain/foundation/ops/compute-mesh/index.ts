import { createOp } from "@swooper/mapgen-core/authoring";
import { devLogIf } from "@swooper/mapgen-core";
import type { TraceScope } from "@swooper/mapgen-core";

import type {
  BoundingBox,
  Point2D,
  RngFunction,
  VoronoiCell,
  VoronoiHalfEdge,
  VoronoiSite,
  VoronoiUtilsInterface,
} from "../../types.js";
import ComputeMeshContract from "./contract.js";
import type { ComputeMeshConfig } from "./contract.js";

function requireRng(rng: RngFunction | undefined): RngFunction {
  if (!rng) {
    throw new Error("[Foundation] RNG not provided for foundation/compute-mesh.");
  }
  return rng;
}

function requireVoronoiUtils(utils: VoronoiUtilsInterface | undefined): VoronoiUtilsInterface {
  if (!utils) {
    throw new Error("[Foundation] Voronoi utilities not provided for foundation/compute-mesh.");
  }
  return utils;
}

function normalizeInt(value: unknown, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.trunc(value as number);
}

function quantizeKey(point: Point2D, scale: number): string {
  const x = Math.round(point.x * scale);
  const y = Math.round(point.y * scale);
  return `${x},${y}`;
}

function extractNeighbors(cells: readonly VoronoiCell[]): ReadonlyArray<ReadonlyArray<number>> {
  if (!cells.length) return [];

  const edges = new Map<string, number>();
  const neighbors: Array<Set<number>> = cells.map(() => new Set<number>());

  const quantScale = 1e4;

  for (let cellId = 0; cellId < cells.length; cellId++) {
    const cell = cells[cellId];
    const halfedges = Array.isArray(cell?.halfedges) ? cell.halfedges : [];
    for (const he of halfedges) {
      const edge = he as unknown as VoronoiHalfEdge;
      const start = edge?.getStartpoint?.();
      const end = edge?.getEndpoint?.();
      if (!start || !end) continue;

      const a = quantizeKey(start, quantScale);
      const b = quantizeKey(end, quantScale);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;

      const other = edges.get(key);
      if (other == null) {
        edges.set(key, cellId);
        continue;
      }

      if (other !== cellId) {
        neighbors[cellId]!.add(other);
        neighbors[other]!.add(cellId);
      }
    }
  }

  return neighbors.map((set) => Object.freeze(Array.from(set).sort((a, b) => a - b)));
}

function packNeighborsCsr(neighbors: ReadonlyArray<ReadonlyArray<number>>): {
  offsets: Int32Array;
  values: Int32Array;
} {
  const cellCount = neighbors.length;
  const offsets = new Int32Array(cellCount + 1);

  let total = 0;
  for (let i = 0; i < cellCount; i++) {
    offsets[i] = total;
    total += neighbors[i]?.length ?? 0;
  }
  offsets[cellCount] = total;

  const values = new Int32Array(total);
  let cursor = 0;
  for (let i = 0; i < cellCount; i++) {
    const list = neighbors[i] ?? [];
    for (let j = 0; j < list.length; j++) {
      values[cursor++] = list[j] | 0;
    }
  }

  return { offsets, values };
}

function createDeterministicSites(
  count: number,
  bbox: BoundingBox,
  rng: RngFunction,
  labelPrefix: string
): VoronoiSite[] {
  const seedBase = (rng(0x7fffffff, `${labelPrefix}:seed`) | 0) >>> 0;
  const sites: VoronoiSite[] = [];

  const w = Math.max(1e-6, bbox.xr - bbox.xl);
  const h = Math.max(1e-6, bbox.yb - bbox.yt);

  for (let id = 0; id < count; id++) {
    let seed = (seedBase + id * 1664525 + 1013904223) >>> 0;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const xUnit = seed / 2 ** 32;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const yUnit = seed / 2 ** 32;

    const x = bbox.xl + xUnit * w;
    const y = bbox.yt + yUnit * h;
    sites.push({ x, y, voronoiId: id });
  }

  return sites;
}

const computeMesh = createOp(ComputeMeshContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const wrapX = !!input.wrapX;
        const trace = (input.trace ?? null) as TraceScope | null;

        const rng = requireRng(input.rng as unknown as RngFunction | undefined);
        const voronoiUtils = requireVoronoiUtils(input.voronoiUtils as unknown as VoronoiUtilsInterface | undefined);

        const cfg = config as unknown as ComputeMeshConfig;
        const plateCount = normalizeInt(cfg?.plateCount, 8);
        const relaxationSteps = normalizeInt(cfg?.relaxationSteps, 2);
        const cellDensity = 0.003;

        const bbox: BoundingBox = { xl: 0, xr: width, yt: 0, yb: height };
        const cellCount = Math.max(
          4,
          plateCount,
          plateCount * 2,
          Math.floor(width * height * Math.max(0, cellDensity))
        );

        devLogIf(
          trace,
          "LOG_FOUNDATION_MESH",
          `[Foundation] Mesh cellCount=${cellCount}, relaxationSteps=${relaxationSteps}, wrapX=${wrapX}`
        );

        const sites = createDeterministicSites(cellCount, bbox, rng, "MeshSites");
        const diagram = voronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);
        const cells = Array.isArray(diagram?.cells) ? diagram.cells : [];

        if (cells.length <= 0) {
          throw new Error("[Foundation] Voronoi returned zero cells for mesh.");
        }

        const effectiveCount = cells.length | 0;
        const siteX = new Float32Array(effectiveCount);
        const siteY = new Float32Array(effectiveCount);
        const areas = new Float32Array(effectiveCount);

        for (let i = 0; i < effectiveCount; i++) {
          const cell = cells[i]!;
          siteX[i] = Math.fround(cell.site?.x ?? 0);
          siteY[i] = Math.fround(cell.site?.y ?? 0);
          areas[i] = Math.fround(voronoiUtils.calculateCellArea(cell as unknown as VoronoiCell) ?? 0);
        }

        const neighborLists = extractNeighbors(cells);
        const csr = packNeighborsCsr(neighborLists);

        return {
          mesh: Object.freeze({
            cellCount: effectiveCount,
            siteX,
            siteY,
            neighborsOffsets: csr.offsets,
            neighbors: csr.values,
            areas,
            bbox,
            wrapX,
          }),
        } as const;
      },
    },
  },
});

export default computeMesh;
