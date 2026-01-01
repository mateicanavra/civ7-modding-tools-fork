import { describe, expect, it } from "bun:test";

import { safeParseConfig } from "@mapgen/config";

describe("features placement config", () => {
  it("rejects unknown feature chance keys", () => {
    const result = safeParseConfig({
      featuresPlacement: {
        strategy: "owned",
        config: {
          chances: {
            FEATURE_FAKE_FEATURE: 20,
          },
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.errors?.some((err) => err.path.includes("FEATURE_FAKE_FEATURE"))).toBe(true);
  });
});
