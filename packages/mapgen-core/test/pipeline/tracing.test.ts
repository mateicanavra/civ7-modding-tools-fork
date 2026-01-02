import { describe, it, expect } from "bun:test";
import { Type } from "typebox";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { createRecipe, createStage, createStep } from "@mapgen/authoring/index.js";
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
          schemaVersion: 2,
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
      plan.settings
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
    expect((stepStart as Record<string, unknown> | undefined)?.nodeId).toBeUndefined();
    expect((stepFinish as Record<string, unknown> | undefined)?.nodeId).toBeUndefined();
  });

  it("emits step.event only for verbose steps", () => {
    const registry = new StepRegistry<ReturnType<typeof createExtendedMapContext>>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object({}),
      run: (context) => {
        context.trace.event({ step: "alpha" });
      },
    });
    registry.register({
      id: "beta",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object({}),
      run: (context) => {
        context.trace.event({ step: "beta" });
      },
    });

    const plan = compileExecutionPlan(
      {
        recipe: {
          schemaVersion: 2,
          steps: [{ id: "alpha" }, { id: "beta" }],
        },
        settings: {
          seed: 123,
          dimensions: { width: 4, height: 3 },
          latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
          wrap: { wrapX: true, wrapY: false },
          trace: { steps: { alpha: "verbose", beta: "off" } },
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
      plan.settings
    );

    const executor = new PipelineExecutor(registry, { log: () => {} });
    executor.executePlan(ctx, plan, { trace: traceSession });

    const stepEvents = events.filter((event) => event.kind === "step.event");
    expect(stepEvents.length).toBeGreaterThan(0);
    expect(stepEvents.every((event) => event.stepId === "alpha")).toBe(true);
  });

  it("defaults to a console sink when trace settings are enabled", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const settings = {
      seed: 5,
      dimensions: { width: 4, height: 3 },
      latitudeBounds: { topLatitude: 45, bottomLatitude: -45 },
      wrap: { wrapX: true, wrapY: false },
      trace: { enabled: true },
    };
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      settings
    );

    const step = createStep({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      schema: Type.Object({}, { additionalProperties: false }),
      run: () => {},
    });
    const stage = createStage({ id: "foundation", steps: [step] });
    const recipe = createRecipe({
      id: "trace",
      tagDefinitions: [],
      stages: [stage],
    });

    const logs: unknown[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args);
    };

    try {
      recipe.run(ctx, settings, { foundation: { alpha: {} } });
    } finally {
      console.log = originalLog;
    }

    expect(logs.length).toBeGreaterThan(0);
  });
});
