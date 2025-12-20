/**
 * Crust Classification
 *
 * Assigns plates as continental or oceanic using a clustering-friendly
 * selection process. This is the first step of the crust-first pipeline.
 */

import type { RngFunction } from "@mapgen/foundation/types.js";
import type { PlateGraph } from "@mapgen/lib/plates/topology.js";
import { pickRandom } from "@mapgen/lib/rng/pick.js";
import { rollUnit } from "@mapgen/lib/rng/unit.js";

export enum CrustType {
  OCEANIC = 0,
  CONTINENTAL = 1,
}

export interface CrustConfig {
  /** Target share of continental plates (0..1, count-based) */
  continentalFraction: number;
  /** Chance for leftover oceanic plates to flip for variety (0..1) */
  microcontinentChance: number;
  /** 0..1: 0 = scatter, 1 = supercontinent clustering */
  clusteringBias: number;
}

const MIN_SEED_AREA = 20;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Assign crust types to plates based on configuration and topology.
 *
 * @param graph - Plate topology graph
 * @param rng - RNG returning [0, max)
 * @param config - Crust parameters
 * @returns Uint8Array mapping plate ID -> CrustType
 */
export function assignCrustTypes(
  graph: PlateGraph,
  rng: RngFunction,
  config: CrustConfig
): Uint8Array {
  const plateCount = graph.length;
  const types = new Uint8Array(plateCount).fill(CrustType.OCEANIC);

  if (plateCount === 0) return types;

  const continentalFraction = clamp01(config.continentalFraction);
  const clusteringBias = clamp01(config.clusteringBias);
  const microcontinentChance = clamp01(config.microcontinentChance);

  const targetContinental = Math.min(
    plateCount,
    Math.max(0, Math.round(plateCount * continentalFraction))
  );

  // Seed candidates favor plates with some area to avoid 1-tile artifacts
  const seedCandidates = graph
    .filter((plate) => plate.area >= MIN_SEED_AREA)
    .map((plate) => plate.id);
  const fallbackCandidates = seedCandidates.length ? seedCandidates : graph.map((plate) => plate.id);

  const frontier = new Set<number>();
  let assignedCount = 0;

  const addNeighborsToFrontier = (plateId: number) => {
    for (const neighborId of graph[plateId]?.neighbors ?? []) {
      if (types[neighborId] === CrustType.OCEANIC) {
        frontier.add(neighborId);
      }
    }
  };

  if (targetContinental > 0 && fallbackCandidates.length) {
    const initialSeed = pickRandom(fallbackCandidates, rng, "crust-seed");
    if (initialSeed !== null) {
      types[initialSeed] = CrustType.CONTINENTAL;
      assignedCount = 1;
      addNeighborsToFrontier(initialSeed);
    }
  }

  while (assignedCount < targetContinental) {
    const shouldCluster = frontier.size > 0 && rollUnit(rng, "crust-cluster") < clusteringBias;
    let nextId: number | null = null;

    if (shouldCluster) {
      const candidates = Array.from(frontier);
      nextId = pickRandom(candidates, rng, "crust-frontier");
      if (nextId !== null) {
        frontier.delete(nextId);
      }
    } else {
      const available = graph
        .filter((plate) => types[plate.id] === CrustType.OCEANIC && plate.area > 0)
        .map((plate) => plate.id);
      nextId = pickRandom(available, rng, "crust-random");
    }

    if (nextId === null) break;

    types[nextId] = CrustType.CONTINENTAL;
    assignedCount++;
    addNeighborsToFrontier(nextId);
  }

  if (microcontinentChance > 0) {
    for (const plate of graph) {
      if (types[plate.id] === CrustType.OCEANIC) {
        const roll = rollUnit(rng, "crust-micro");
        if (roll < microcontinentChance) {
          types[plate.id] = CrustType.CONTINENTAL;
        }
      }
    }
  }

  return types;
}
