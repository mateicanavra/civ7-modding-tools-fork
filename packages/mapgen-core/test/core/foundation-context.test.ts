import { describe, it, expect } from "bun:test";
import { validateFoundationContext } from "@mapgen/core/types.js";
import type { FoundationContext } from "@mapgen/core/types.js";

function makeFoundationContext(width: number, height: number): FoundationContext {
  const size = width * height;
  return {
    dimensions: { width, height, size },
    plateSeed: null,
    plates: {
      id: new Int16Array(size),
      boundaryCloseness: new Uint8Array(size),
      boundaryType: new Uint8Array(size),
      tectonicStress: new Uint8Array(size),
      upliftPotential: new Uint8Array(size),
      riftPotential: new Uint8Array(size),
      shieldStability: new Uint8Array(size),
      movementU: new Int8Array(size),
      movementV: new Int8Array(size),
      rotation: new Int8Array(size),
    },
    dynamics: {
      windU: new Int8Array(size),
      windV: new Int8Array(size),
      currentU: new Int8Array(size),
      currentV: new Int8Array(size),
      pressure: new Uint8Array(size),
    },
    diagnostics: { boundaryTree: null },
    config: {
      seed: {},
      plates: {},
      dynamics: {},
      surface: {},
      policy: {},
      diagnostics: {},
    },
  };
}

describe("core/foundation-context", () => {
  it("throws when plate tensor sizes do not match dimensions", () => {
    const foundation = makeFoundationContext(4, 3);
    foundation.plates.id = new Int16Array(2);

    expect(() => validateFoundationContext(foundation, { width: 4, height: 3 })).toThrow(
      "plateId"
    );
  });

  it("throws when dynamics tensors are missing", () => {
    const foundation = makeFoundationContext(4, 3);
    (foundation.dynamics as Record<string, unknown>).windU = undefined;

    expect(() => validateFoundationContext(foundation, { width: 4, height: 3 })).toThrow(
      "windU"
    );
  });
});
