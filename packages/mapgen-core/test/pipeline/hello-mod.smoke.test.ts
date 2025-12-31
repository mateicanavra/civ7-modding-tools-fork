import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import {
  compileExecutionPlan,
  PipelineExecutor,
  type PipelineModV1,
  StepRegistry,
} from "@mapgen/engine/index.js";

describe("pipeline: hello mod compile/execute (no standard-domain imports)", () => {
  it("compiles and executes a minimal mod registration", () => {
    const registry = new StepRegistry<ExtendedMapContext>();

    const helloMod: PipelineModV1<ExtendedMapContext, MapGenConfig, void> = {
      id: "test.hello",
      recipes: {
        default: {
          schemaVersion: 1,
          id: "test.hello",
          steps: [{ id: "hello" }],
        },
      },
      register(target) {
        target.register({
          id: "hello",
          phase: "foundation",
          requires: [],
          provides: [],
          run(context) {
            context.metrics.warnings.push("hello");
          },
        });
      },
    };

    helloMod.register(registry, {} as MapGenConfig, undefined);

    const width = 8;
    const height = 6;
    const adapter = createMockAdapter({ width, height, mapSizeId: 1 });
    const ctx = createExtendedMapContext({ width, height }, adapter, {} as MapGenConfig);

    const plan = compileExecutionPlan(
      {
        recipe: helloMod.recipes!.default,
        settings: {
          seed: 1,
          dimensions: { width, height },
          latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
          wrap: { wrapX: true, wrapY: false },
        },
      },
      registry
    );

    const executor = new PipelineExecutor(registry, { logPrefix: "[TEST]" });
    const { stepResults } = executor.executePlan(ctx, plan);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(true);
    expect(ctx.metrics.warnings).toContain("hello");
  });
});

