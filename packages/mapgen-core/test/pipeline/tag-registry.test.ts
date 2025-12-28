import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@mapgen/core/types.js";

import {
  InvalidDependencyTagDemoError,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  UnknownDependencyTagError,
} from "@mapgen/engine/index.js";

const TEST_TAGS = {
  effect: {
    biomesApplied: "effect:test.biomesApplied",
    coastlinesApplied: "effect:test.coastlinesApplied",
  },
} as const;

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
      {} as ReturnType<typeof createExtendedMapContext>["config"]
    );

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTag({
      id: TEST_TAGS.effect.biomesApplied,
      kind: "effect",
      satisfies: (_context, _state) => false,
    });
    registry.register({
      id: "biomes",
      phase: "ecology",
      requires: [],
      provides: [TEST_TAGS.effect.biomesApplied],
      run: () => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(ctx, ["biomes"]);

    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain(TEST_TAGS.effect.biomesApplied);
  });

  it("accepts provides when effect postconditions pass", () => {
    const adapter = createMockAdapter({ width: 2, height: 2 });
    const ctx = createExtendedMapContext(
      { width: 2, height: 2 },
      adapter,
      {} as ReturnType<typeof createExtendedMapContext>["config"]
    );

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTag({
      id: TEST_TAGS.effect.coastlinesApplied,
      kind: "effect",
      satisfies: (_context, _state) => true,
    });
    registry.register({
      id: "coastlines",
      phase: "morphology",
      requires: [],
      provides: [TEST_TAGS.effect.coastlinesApplied],
      run: () => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(ctx, ["coastlines"]);

    expect(stepResults[0]?.success).toBe(true);
  });
});
