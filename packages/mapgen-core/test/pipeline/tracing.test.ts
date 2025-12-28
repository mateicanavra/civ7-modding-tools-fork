import { describe, it, expect } from "bun:test";
import { Type } from "typebox";
import { createMockAdapter } from "@civ7/adapter";
import type { MapGenConfig } from "@mapgen/config/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import {
  PipelineExecutor,
  StepRegistry,
  compileExecutionPlan,
  createTraceSessionFromPlan,
} from "@mapgen/engine/index.js";
import type { TraceEvent } from "@mapgen/trace/index.js";

describe("pipeline tracing", () => {
  it("emits run/step timing events with runId and plan fingerprint", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object({}),
      run: () => {},
    });

    const plan = compileExecutionPlan(
      {
        recipe: {
          schemaVersion: 1,
          steps: [{ id: "alpha" }],
        },
        settings: {
          seed: 123,
          dimensions: { width: 4, height: 3 },
          latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
          wrap: { wrapX: true, wrapY: false },
          trace: { enabled: true },
        },
      },
      registry
    );

    const events: TraceEvent[] = [];
    const traceSession = createTraceSessionFromPlan(plan, {
      emit: (event) => events.push(event),
    });

    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      {} as unknown as MapGenConfig
    );

    const executor = new PipelineExecutor(registry, { log: () => {} });
    executor.execute(ctx, ["alpha"], { trace: traceSession });

    const runStart = events.find((event) => event.kind === "run.start");
    const runFinish = events.find((event) => event.kind === "run.finish");
    const stepStart = events.find((event) => event.kind === "step.start");
    const stepFinish = events.find((event) => event.kind === "step.finish");

    expect(runStart).toBeTruthy();
    expect(runFinish).toBeTruthy();
    expect(stepStart).toBeTruthy();
    expect(stepFinish).toBeTruthy();
    expect(runStart?.runId).toBe(runFinish?.runId);
    expect(runStart?.planFingerprint).toBe(runFinish?.planFingerprint);
    expect(stepStart?.runId).toBe(runStart?.runId);
    expect(stepFinish?.planFingerprint).toBe(runStart?.planFingerprint);
  });
});
