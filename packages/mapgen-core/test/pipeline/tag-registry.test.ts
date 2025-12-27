import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { MapGenConfig } from "@mapgen/config/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { M4_EFFECT_TAGS, registerBaseTags } from "@mapgen/base/index.js";

import {
  InvalidDependencyTagDemoError,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  UnknownDependencyTagError,
} from "@mapgen/pipeline/index.js";

describe("tag registry", () => {
  it("fails fast on unknown dependency tags at registration", () => {
    const registry = new StepRegistry<unknown>();

    expect(() =>
      registry.register({
        id: "alpha",
        phase: "foundation",
        requires: ["artifact:missing"],
        provides: [],
        run: () => {},
      })
    ).toThrow(UnknownDependencyTagError);
  });

  it("fails fast on invalid demo payloads", () => {
    const registry = new TagRegistry();

    expect(() =>
      registry.registerTag({
        id: "artifact:demo",
        kind: "artifact",
        demo: "bad",
        validateDemo: (demo) => typeof demo === "number",
      })
    ).toThrow(InvalidDependencyTagDemoError);
  });

  it("surfaces effect postcondition failures with the effect tag id", () => {
    const adapter = createMockAdapter({ width: 2, height: 2 });
    const ctx = createExtendedMapContext(
      { width: 2, height: 2 },
      adapter,
      {} as unknown as MapGenConfig
    );

    const registry = new StepRegistry<typeof ctx>();
    registerBaseTags(registry);
    registry.register({
      id: "biomes",
      phase: "ecology",
      requires: [],
      provides: [M4_EFFECT_TAGS.engine.biomesApplied],
      run: () => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(ctx, ["biomes"]);

    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain(M4_EFFECT_TAGS.engine.biomesApplied);
  });
});
