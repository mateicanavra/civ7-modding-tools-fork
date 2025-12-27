import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import {
  MissingDependencyError,
  M3_DEPENDENCY_TAGS,
  M3_STAGE_DEPENDENCY_SPINE,
  M4_EFFECT_TAGS,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/pipeline/index.js";

describe("placement step contracts", () => {
  it("fails fast when placement runs without placementInputs", () => {
    const width = 4;
    const height = 4;
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"]
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.register({
      id: "coastlines",
      phase: "morphology",
      requires: [],
      provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
      run: (_context, _config) => {},
    });
    registry.register({
      id: "rivers",
      phase: "hydrology",
      requires: [],
      provides: [M4_EFFECT_TAGS.engine.riversModeled],
      run: (_context, _config) => {},
    });
    registry.register({
      id: "placement",
      phase: "placement",
      requires: M3_STAGE_DEPENDENCY_SPINE.placement.requires,
      provides: M3_STAGE_DEPENDENCY_SPINE.placement.provides,
      run: (_context, _config) => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });

    try {
      executor.execute(context, ["coastlines", "rivers", "placement"]);
      throw new Error("Expected placement gating to fail");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingDependencyError);
      expect((err as MissingDependencyError).stepId).toBe("placement");
      expect((err as MissingDependencyError).missing).toEqual([
        M3_DEPENDENCY_TAGS.artifact.placementInputsV1,
      ]);
    }
  });

  it("fails fast when placementInputs are published with an invalid payload", () => {
    const width = 4;
    const height = 4;
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"]
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.register({
      id: "derivePlacementInputs",
      phase: "placement",
      requires: [],
      provides: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
      run: (_context, _config) => {
        _context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.placementInputsV1, {
          mapInfo: {},
          starts: {},
          placementConfig: {},
        });
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(context, ["derivePlacementInputs"]);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(M3_DEPENDENCY_TAGS.artifact.placementInputsV1);
  });

  it("fails fast when placement outputs are missing", () => {
    const width = 4;
    const height = 4;
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"]
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.register({
      id: "placement",
      phase: "placement",
      requires: [],
      provides: [M4_EFFECT_TAGS.engine.placementApplied],
      run: (_context, _config) => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(context, ["placement"]);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(M4_EFFECT_TAGS.engine.placementApplied);
  });

  it("fails fast when placement outputs are invalid", () => {
    const width = 4;
    const height = 4;
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"]
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.register({
      id: "placement",
      phase: "placement",
      requires: [],
      provides: [M4_EFFECT_TAGS.engine.placementApplied],
      run: (_context, _config) => {
        _context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1, {
          startsAssigned: 0,
        });
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(context, ["placement"]);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(M4_EFFECT_TAGS.engine.placementApplied);
  });
});
