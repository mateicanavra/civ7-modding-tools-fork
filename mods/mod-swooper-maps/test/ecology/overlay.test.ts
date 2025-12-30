/**
 * Narrative Overlay Tests
 *
 * Tests the narrative overlay layer with controlled RNG.
 */

import { describe, it, expect } from "bun:test";
import {
  applyNarrativeOverlay,
  buildNarrativeContext,
  DEFAULT_NARRATIVE_POLICY,
} from "@mapgen/domain/ecology/classification/overlay.js";
import { BiomeId } from "@mapgen/domain/ecology/classification/types.js";
import type { DerivedClimate } from "@mapgen/domain/ecology/classification/types.js";
import type {
  TileNarrativeContext,
  NarrativePolicy,
} from "@mapgen/domain/ecology/classification/overlay.js";

// ============================================================================
// Test Helpers
// ============================================================================

function makeDerived(overrides: Partial<DerivedClimate> = {}): DerivedClimate {
  return {
    latitude: 35,
    elevation: 100,
    rainfall: 100,
    isCoastal: false,
    riverAdjacent: false,
    temperature: 18,
    aridity: 0.25,
    moistureIndex: 0.5,
    ...overrides,
  };
}

function noNarrative(): TileNarrativeContext {
  return {
    isLandCorridor: false,
    isRiverCorridor: false,
    isRiftShoulder: false,
  };
}

function landCorridor(): TileNarrativeContext {
  return {
    isLandCorridor: true,
    isRiverCorridor: false,
    isRiftShoulder: false,
  };
}

function riftShoulder(): TileNarrativeContext {
  return {
    isLandCorridor: false,
    isRiverCorridor: false,
    isRiftShoulder: true,
  };
}

// Controlled RNG that always returns a specific value
function fixedRng(value: number): (label: string, max: number) => number {
  return () => value;
}

// RNG that passes (returns 0 - always below threshold)
const alwaysPassRng = fixedRng(0);

// RNG that fails (returns 100 - always above threshold)
const alwaysFailRng = fixedRng(100);

// ============================================================================
// Corridor Overlay Tests
// ============================================================================

describe("Corridor Overlay", () => {
  it("should not apply to tiles without narrative features", () => {
    const climate = makeDerived();
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      noNarrative(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.PLAINS);
  });

  it("should convert plains to grassland on corridor tiles", () => {
    const climate = makeDerived({ temperature: 15, moistureIndex: 0.5 });
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      landCorridor(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });

  it("should not convert if already grassland", () => {
    const climate = makeDerived();
    const result = applyNarrativeOverlay(
      BiomeId.GRASSLAND,
      climate,
      landCorridor(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });

  it("should not convert desert to grassland if climate too dry", () => {
    const climate = makeDerived({ moistureIndex: 0.1, temperature: 25 });
    const result = applyNarrativeOverlay(
      BiomeId.DESERT,
      climate,
      landCorridor(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.DESERT);
  });

  it("should not convert if climate too cold", () => {
    const climate = makeDerived({ temperature: -5 });
    const result = applyNarrativeOverlay(
      BiomeId.TUNDRA,
      climate,
      landCorridor(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.TUNDRA);
  });

  it("should respect corridor strength (fail when RNG too high)", () => {
    const climate = makeDerived();
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      landCorridor(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysFailRng
    );
    expect(result).toBe(BiomeId.PLAINS);
  });

  it("should apply to river corridors the same as land corridors", () => {
    const climate = makeDerived();
    const narrative: TileNarrativeContext = {
      isLandCorridor: false,
      isRiverCorridor: true,
      isRiftShoulder: false,
    };
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      narrative,
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });
});

// ============================================================================
// Rift Shoulder Overlay Tests
// ============================================================================

describe("Rift Shoulder Overlay", () => {
  it("should convert to tropical if climate allows", () => {
    const climate = makeDerived({
      temperature: 25,
      moistureIndex: 0.7,
      latitude: 15,
    });
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      riftShoulder(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.TROPICAL);
  });

  it("should convert to grassland if too cold for tropical but warm enough", () => {
    const climate = makeDerived({
      temperature: 15,
      moistureIndex: 0.5,
      latitude: 35,
    });
    const result = applyNarrativeOverlay(
      BiomeId.DESERT,
      climate,
      riftShoulder(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });

  it("should not convert if already tropical", () => {
    const climate = makeDerived({
      temperature: 26,
      moistureIndex: 0.8,
      latitude: 10,
    });
    const result = applyNarrativeOverlay(
      BiomeId.TROPICAL,
      climate,
      riftShoulder(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.TROPICAL);
  });

  it("should not convert if already grassland", () => {
    const climate = makeDerived();
    const result = applyNarrativeOverlay(
      BiomeId.GRASSLAND,
      climate,
      riftShoulder(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });

  it("should not convert if climate too cold and dry", () => {
    const climate = makeDerived({
      temperature: -10,
      moistureIndex: 0.1,
    });
    const result = applyNarrativeOverlay(
      BiomeId.SNOW,
      climate,
      riftShoulder(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.SNOW);
  });

  it("should respect rift strength (fail when RNG too high)", () => {
    const climate = makeDerived({
      temperature: 25,
      moistureIndex: 0.7,
      latitude: 15,
    });
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      riftShoulder(),
      DEFAULT_NARRATIVE_POLICY,
      alwaysFailRng
    );
    expect(result).toBe(BiomeId.PLAINS);
  });
});

// ============================================================================
// Policy Tests
// ============================================================================

describe("Narrative Policy", () => {
  it("should never apply corridor overlay when strength is 0", () => {
    const climate = makeDerived();
    const policy: NarrativePolicy = { corridorStrength: 0, riftStrength: 0.5 };
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      landCorridor(),
      policy,
      alwaysPassRng // RNG returns 0, but 0 >= 0*100
    );
    expect(result).toBe(BiomeId.PLAINS);
  });

  it("should always apply corridor overlay when strength is 1", () => {
    const climate = makeDerived();
    const policy: NarrativePolicy = { corridorStrength: 1, riftStrength: 0.5 };
    // RNG returns 99, which is < 100
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      landCorridor(),
      policy,
      fixedRng(99)
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });

  it("should never apply rift overlay when strength is 0", () => {
    const climate = makeDerived({
      temperature: 25,
      moistureIndex: 0.7,
      latitude: 15,
    });
    const policy: NarrativePolicy = { corridorStrength: 0.6, riftStrength: 0 };
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      riftShoulder(),
      policy,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.PLAINS);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("buildNarrativeContext", () => {
  it("should build context from sets", () => {
    const landCorridors = new Set(["1,1", "2,2"]);
    const riverCorridors = new Set(["3,3"]);
    const riftShoulder = new Set(["4,4"]);

    const ctx = buildNarrativeContext("1,1", landCorridors, riverCorridors, riftShoulder);
    expect(ctx.isLandCorridor).toBe(true);
    expect(ctx.isRiverCorridor).toBe(false);
    expect(ctx.isRiftShoulder).toBe(false);
  });

  it("should handle null sets", () => {
    const ctx = buildNarrativeContext("1,1", null, null, null);
    expect(ctx.isLandCorridor).toBe(false);
    expect(ctx.isRiverCorridor).toBe(false);
    expect(ctx.isRiftShoulder).toBe(false);
  });

  it("should handle undefined sets", () => {
    const ctx = buildNarrativeContext("1,1", undefined, undefined, undefined);
    expect(ctx.isLandCorridor).toBe(false);
    expect(ctx.isRiverCorridor).toBe(false);
    expect(ctx.isRiftShoulder).toBe(false);
  });
});

// ============================================================================
// Combined Narrative Tests
// ============================================================================

describe("Combined Narratives", () => {
  it("should apply corridor first if both corridor and rift apply", () => {
    const climate = makeDerived({
      temperature: 22,
      moistureIndex: 0.6,
      latitude: 20,
    });
    const narrative: TileNarrativeContext = {
      isLandCorridor: true,
      isRiverCorridor: false,
      isRiftShoulder: true,
    };
    // Corridor applies first and converts to grassland
    const result = applyNarrativeOverlay(
      BiomeId.PLAINS,
      climate,
      narrative,
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    expect(result).toBe(BiomeId.GRASSLAND);
  });

  it("should fall through to rift if corridor already satisfied", () => {
    const climate = makeDerived({
      temperature: 25,
      moistureIndex: 0.7,
      latitude: 15,
    });
    const narrative: TileNarrativeContext = {
      isLandCorridor: true,
      isRiverCorridor: false,
      isRiftShoulder: true,
    };
    // Already grassland, so corridor doesn't apply, rift upgrades to tropical
    const result = applyNarrativeOverlay(
      BiomeId.GRASSLAND,
      climate,
      narrative,
      DEFAULT_NARRATIVE_POLICY,
      alwaysPassRng
    );
    // Grassland is already a "fertile" biome, so rift doesn't upgrade it
    expect(result).toBe(BiomeId.GRASSLAND);
  });
});
