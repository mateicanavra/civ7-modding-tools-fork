import { Delaunay } from "d3-delaunay";
import { rollUnit, type RngFn } from "@mapgen/lib/rng/unit.js";

export type MeshBBox = {
  xl: number;
  xr: number;
  yt: number;
  yb: number;
};

export type DelaunayMesh = {
  cellCount: number;
  siteX: Float32Array;
  siteY: Float32Array;
  neighborsOffsets: Int32Array;
  neighbors: Int32Array;
  areas: Float32Array;
  bbox: MeshBBox;
};

export type DelaunayMeshInput = {
  width: number;
  height: number;
  cellCount: number;
  relaxationSteps: number;
  rng: RngFn;
  label?: string;
};

type Point2D = { x: number; y: number };
type Polygon2D = Array<[number, number]>;

function polygonArea(points: Polygon2D): number {
  const count = points.length;
  if (count < 3) return 0;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % count]!;
    sum += x0 * y1 - x1 * y0;
  }
  return sum / 2;
}

function polygonCentroid(points: Polygon2D): { x: number; y: number; area: number } {
  const count = points.length;
  if (count < 3) return { x: 0, y: 0, area: 0 };

  let cx = 0;
  let cy = 0;
  let crossSum = 0;

  for (let i = 0; i < count; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % count]!;
    const cross = x0 * y1 - x1 * y0;
    crossSum += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  const area = crossSum / 2;
  if (!Number.isFinite(area) || Math.abs(area) < 1e-8) {
    return { x: 0, y: 0, area: 0 };
  }
  const scale = 1 / (3 * crossSum);
  return { x: cx * scale, y: cy * scale, area };
}

function normalizePolygon(points: Polygon2D | null | undefined): Polygon2D | null {
  if (!points || points.length < 3) return null;
  if (points.length > 2) {
    const [x0, y0] = points[0]!;
    const [xN, yN] = points[points.length - 1]!;
    if (x0 === xN && y0 === yN) {
      return points.slice(0, -1);
    }
  }
  return points;
}

function buildNeighborsCsr(neighborsBySite: Array<number[]>): {
  offsets: Int32Array;
  values: Int32Array;
} {
  const cellCount = neighborsBySite.length;
  const offsets = new Int32Array(cellCount + 1);
  let total = 0;
  for (let i = 0; i < cellCount; i++) {
    offsets[i] = total;
    total += neighborsBySite[i]!.length;
  }
  offsets[cellCount] = total;

  const values = new Int32Array(total);
  let cursor = 0;
  for (let i = 0; i < cellCount; i++) {
    const list = neighborsBySite[i]!;
    for (let j = 0; j < list.length; j++) {
      values[cursor++] = list[j] | 0;
    }
  }

  return { offsets, values };
}

export function buildDelaunayMesh(input: DelaunayMeshInput): DelaunayMesh {
  const width = Math.max(1, input.width | 0);
  const height = Math.max(1, input.height | 0);
  const cellCount = Math.max(1, input.cellCount | 0);
  const relaxationSteps = Math.max(0, input.relaxationSteps | 0);
  const label = input.label ?? "FoundationMesh";

  const bbox: MeshBBox = { xl: 0, xr: width, yt: 0, yb: height };
  const spanX = Math.max(1e-6, bbox.xr - bbox.xl);
  const spanY = Math.max(1e-6, bbox.yb - bbox.yt);

  let sites: Point2D[] = Array.from({ length: cellCount }, () => ({ x: 0, y: 0 }));
  for (let i = 0; i < cellCount; i++) {
    const x = bbox.xl + rollUnit(input.rng, `${label}:x`) * spanX;
    const y = bbox.yt + rollUnit(input.rng, `${label}:y`) * spanY;
    sites[i] = { x, y };
  }

  for (let step = 0; step < relaxationSteps; step++) {
    const delaunay = Delaunay.from(sites, (p) => p.x, (p) => p.y);
    const voronoi = delaunay.voronoi([bbox.xl, bbox.yt, bbox.xr, bbox.yb]);
    const nextSites: Point2D[] = Array.from({ length: cellCount }, () => ({ x: 0, y: 0 }));

    for (let i = 0; i < cellCount; i++) {
      const polygon = normalizePolygon(voronoi.cellPolygon(i));
      if (!polygon) {
        nextSites[i] = sites[i]!;
        continue;
      }
      const centroid = polygonCentroid(polygon);
      if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.y) || centroid.area === 0) {
        nextSites[i] = sites[i]!;
        continue;
      }
      nextSites[i] = { x: centroid.x, y: centroid.y };
    }

    sites = nextSites;
  }

  const delaunay = Delaunay.from(sites, (p) => p.x, (p) => p.y);
  const voronoi = delaunay.voronoi([bbox.xl, bbox.yt, bbox.xr, bbox.yb]);

  const siteX = new Float32Array(cellCount);
  const siteY = new Float32Array(cellCount);
  const areas = new Float32Array(cellCount);
  const neighborsBySite: Array<number[]> = Array.from({ length: cellCount }, () => []);

  for (let i = 0; i < cellCount; i++) {
    const site = sites[i]!;
    siteX[i] = Math.fround(site.x);
    siteY[i] = Math.fround(site.y);

    const polygon = normalizePolygon(voronoi.cellPolygon(i));
    if (polygon) {
      const area = polygonArea(polygon);
      areas[i] = Math.fround(Math.abs(area));
    } else {
      areas[i] = 0;
    }

    const neighborSet = new Set<number>();
    for (const neighbor of delaunay.neighbors(i)) {
      neighborSet.add(neighbor);
    }
    const sorted = Array.from(neighborSet).sort((a, b) => a - b);
    neighborsBySite[i] = sorted;
  }

  const csr = buildNeighborsCsr(neighborsBySite);

  return {
    cellCount,
    siteX,
    siteY,
    neighborsOffsets: csr.offsets,
    neighbors: csr.values,
    areas,
    bbox,
  };
}
