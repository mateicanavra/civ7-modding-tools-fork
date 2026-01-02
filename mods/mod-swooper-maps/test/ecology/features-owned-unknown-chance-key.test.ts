import { describe, expect, it } from "bun:test";

import {
  resolveFeaturesPlacementOwnedConfig,
  type FeaturesPlacementOwnedConfig,
} from "@mapgen/domain/ecology/ops/features-placement/index.js";

describe("features placement config", () => {
  it("rejects unknown feature chance keys", () => {
    const invalidConfig = {
      chances: {
        FEATURE_FAKE_FEATURE: 20,
      },
    } as unknown as FeaturesPlacementOwnedConfig;

    expect(() => resolveFeaturesPlacementOwnedConfig(invalidConfig)).toThrow(
      "unknown feature keys"
    );
  });
});
