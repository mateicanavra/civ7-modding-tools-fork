import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { FoundationDirectionalityConfigSchema } from "@mapgen/domain/config";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "@mapgen/domain/narrative/overlays/index.js";
import {
  storyTagOrogenyBelts,
} from "@mapgen/domain/narrative/orogeny/index.js";
import { normalizeStrictOrThrow } from "../support/compiler-helpers.js";

describe("story/orogeny", () => {
  it("publishes an overlay when provided foundation tensors", () => {
    const width = 30;
    const height = 20;
    const size = width * height;
    const directionality = normalizeStrictOrThrow(
      FoundationDirectionalityConfigSchema,
      {},
      "/env/directionality"
    );
    const env = {
      seed: 0,
      dimensions: { width, height },
      latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
      wrap: { wrapX: false, wrapY: false },
      directionality,
    };
    const adapter = createMockAdapter({ width, height });

    // Create a dense mountain patch to exceed the minLenSoft floor (>=10).
    for (let y = 6; y <= 10; y++) {
      for (let x = 10; x <= 14; x++) {
        (adapter as any).setMountain(x, y, true);
      }
    }

    const config = { story: { orogeny: { beltMinLength: 12 } } };
    const ctx = createExtendedMapContext({ width, height }, adapter, env);

    const plates = {
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
    };
    const dynamics = {
      windU: new Int8Array(size),
      windV: new Int8Array(size),
      currentU: new Int8Array(size),
      currentV: new Int8Array(size),
      pressure: new Uint8Array(size),
    };

    storyTagOrogenyBelts(ctx, config.story, plates, dynamics);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.OROGENY);
    expect(overlay).not.toBeNull();
  });
});
