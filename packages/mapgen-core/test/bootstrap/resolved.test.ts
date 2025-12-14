/**
 * Stage Manifest Resolver Tests
 *
 * Tests for the Config Air Gap fix: stageConfig -> stageManifest resolution.
 *
 * Key acceptance criteria:
 * - stageEnabled("foundation") returns true when stageConfig.foundation = true
 * - stageEnabled("landmassPlates") returns true when stageConfig.landmassPlates = true
 * - Disabled stages return false
 */

import { describe, it, expect, beforeEach, spyOn } from "bun:test";
import {
  bootstrap,
  resetBootstrap,
  stageEnabled,
  STAGE_ORDER,
  resolveStageManifest,
  validateOverrides,
  validateStageDrift,
  resetDriftCheck,
} from "../../src/bootstrap/entry.js";
import { M3_DEPENDENCY_TAGS } from "../../src/pipeline/index.js";

describe("bootstrap/resolved", () => {
  beforeEach(() => {
    resetBootstrap();
    resetDriftCheck();
  });

  describe("STAGE_ORDER", () => {
    it("exports canonical stage order", () => {
      expect(STAGE_ORDER).toBeDefined();
      expect(Array.isArray(STAGE_ORDER)).toBe(true);
      expect(STAGE_ORDER.length).toBeGreaterThan(0);
    });

    it("includes core stages in correct order", () => {
      expect(STAGE_ORDER[0]).toBe("foundation");
      expect(STAGE_ORDER[1]).toBe("landmassPlates");
      expect(STAGE_ORDER).toContain("coastlines");
      expect(STAGE_ORDER).toContain("mountains");
      expect(STAGE_ORDER).toContain("biomes");
      expect(STAGE_ORDER).toContain("placement");
    });

    it("is frozen (immutable)", () => {
      expect(Object.isFrozen(STAGE_ORDER)).toBe(true);
    });
  });

  describe("resolveStageManifest", () => {
    it("creates manifest with all stages from STAGE_ORDER", () => {
      const manifest = resolveStageManifest({});

      expect(manifest.order).toEqual([...STAGE_ORDER]);
      expect(Object.keys(manifest.stages).length).toBe(STAGE_ORDER.length);
    });

    it("enables stages that are true in stageConfig", () => {
      const manifest = resolveStageManifest({
        foundation: true,
        landmassPlates: true,
        coastlines: true,
      });

      expect(manifest.stages.foundation?.enabled).toBe(true);
      expect(manifest.stages.landmassPlates?.enabled).toBe(true);
      expect(manifest.stages.coastlines?.enabled).toBe(true);
    });

    it("disables stages that are false in stageConfig", () => {
      const manifest = resolveStageManifest({
        foundation: false,
        biomes: false,
      });

      expect(manifest.stages.foundation?.enabled).toBe(false);
      expect(manifest.stages.biomes?.enabled).toBe(false);
    });

    it("disables stages not present in stageConfig", () => {
      const manifest = resolveStageManifest({
        foundation: true,
      });

      // Only foundation enabled, all others disabled
      expect(manifest.stages.foundation?.enabled).toBe(true);
      expect(manifest.stages.landmassPlates?.enabled).toBe(false);
      expect(manifest.stages.coastlines?.enabled).toBe(false);
      expect(manifest.stages.biomes?.enabled).toBe(false);
    });

    it("handles undefined stageConfig", () => {
      const manifest = resolveStageManifest(undefined);

      // All stages disabled
      expect(manifest.stages.foundation?.enabled).toBe(false);
      expect(manifest.stages.landmassPlates?.enabled).toBe(false);
    });

    it("handles empty stageConfig", () => {
      const manifest = resolveStageManifest({});

      // All stages disabled
      expect(manifest.stages.foundation?.enabled).toBe(false);
      expect(manifest.stages.landmassPlates?.enabled).toBe(false);
    });

    it("wires hydrology prerequisites into the manifest", () => {
      const manifest = resolveStageManifest({
        foundation: true,
        lakes: true,
        climateBaseline: true,
        rivers: true,
        climateRefine: true,
      });

      expect(manifest.stages.climateBaseline?.requires).toContain(
        M3_DEPENDENCY_TAGS.artifact.foundation
      );
      expect(manifest.stages.climateBaseline?.requires).toContain(
        M3_DEPENDENCY_TAGS.artifact.heightfield
      );

      expect(manifest.stages.rivers?.requires).toContain(M3_DEPENDENCY_TAGS.artifact.heightfield);
      expect(manifest.stages.climateRefine?.requires).toContain(
        M3_DEPENDENCY_TAGS.artifact.riverAdjacency
      );
    });
  });

  describe("stageEnabled integration", () => {
    it("returns true for enabled stages after bootstrap", () => {
      bootstrap({
        stageConfig: {
          foundation: true,
          landmassPlates: true,
          coastlines: true,
        },
      });

      expect(stageEnabled("foundation")).toBe(true);
      expect(stageEnabled("landmassPlates")).toBe(true);
      expect(stageEnabled("coastlines")).toBe(true);
    });

    it("returns false for disabled stages after bootstrap", () => {
      bootstrap({
        stageConfig: {
          foundation: true,
          landmassPlates: true,
        },
      });

      // Not enabled in stageConfig
      expect(stageEnabled("biomes")).toBe(false);
      expect(stageEnabled("features")).toBe(false);
      expect(stageEnabled("placement")).toBe(false);
    });

    it("returns false for unknown stages", () => {
      bootstrap({
        stageConfig: {
          foundation: true,
        },
      });

      expect(stageEnabled("nonexistent")).toBe(false);
    });

    it("populates stageManifest in config after bootstrap", () => {
      const config = bootstrap({
        stageConfig: {
          foundation: true,
          mountains: true,
        },
      });

      expect(config.stageManifest).toBeDefined();
      expect(config.stageManifest?.stages?.foundation?.enabled).toBe(true);
      expect(config.stageManifest?.stages?.mountains?.enabled).toBe(true);
      expect(config.stageManifest?.stages?.biomes?.enabled).toBe(false);
    });
  });

  describe("validateOverrides", () => {
    it("warns when override targets disabled stage", () => {
      const warnSpy = spyOn(console, "warn");

      const manifest = resolveStageManifest({
        foundation: true,
        // biomes NOT enabled
      });

      validateOverrides({ biomes: { tundra: { latMin: 80 } } }, manifest);

      expect(warnSpy).toHaveBeenCalledWith(
        '[StageManifest] Override targets disabled stage: "biomes"'
      );

      warnSpy.mockRestore();
    });

    it("does not warn when override targets enabled stage", () => {
      const warnSpy = spyOn(console, "warn");

      const manifest = resolveStageManifest({
        foundation: true,
        biomes: true,
      });

      validateOverrides({ biomes: { tundra: { latMin: 80 } } }, manifest);

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("does not warn for non-stage override keys", () => {
      const warnSpy = spyOn(console, "warn");

      const manifest = resolveStageManifest({ foundation: true });

      // These are config keys, not stage names
      validateOverrides(
        {
          landmass: { baseWaterPercent: 40 },
          toggles: { STORY_ENABLE_HOTSPOTS: false },
        },
        manifest
      );

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("handles undefined overrides", () => {
      const manifest = resolveStageManifest({ foundation: true });

      // Should not throw
      expect(() => validateOverrides(undefined, manifest)).not.toThrow();
    });
  });

  describe("full integration: Config Air Gap fix", () => {
    it("stageConfig enables stages via manifest (acceptance test)", () => {
      // This is the key acceptance test from the issue spec
      bootstrap({
        stageConfig: {
          foundation: true,
          landmassPlates: true,
          coastlines: true,
        },
      });

      expect(stageEnabled("foundation")).toBe(true);
      expect(stageEnabled("landmassPlates")).toBe(true);
      expect(stageEnabled("coastlines")).toBe(true);
      expect(stageEnabled("biomes")).toBe(false); // Not enabled
    });

    it("all stages disabled when no stageConfig provided", () => {
      bootstrap({});

      // Without stageConfig, all stages should be disabled
      expect(stageEnabled("foundation")).toBe(false);
      expect(stageEnabled("landmassPlates")).toBe(false);
    });

    it("stages remain correct after resetBootstrap", () => {
      bootstrap({
        stageConfig: { foundation: true },
      });
      expect(stageEnabled("foundation")).toBe(true);

      resetBootstrap();
      // After reset, stageEnabled throws because tunables are not bound (fail-fast)
      expect(() => stageEnabled("foundation")).toThrow("Tunables not initialized");

      // Bootstrap again with different config
      bootstrap({
        stageConfig: { biomes: true },
      });
      expect(stageEnabled("foundation")).toBe(false);
      expect(stageEnabled("biomes")).toBe(true);
    });
  });

  describe("validateStageDrift", () => {
    it("does not warn when orchestrator stages match STAGE_ORDER", () => {
      const warnSpy = spyOn(console, "warn");

      // Pass the exact STAGE_ORDER - no drift
      validateStageDrift([...STAGE_ORDER]);

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("warns when orchestrator has stage not in STAGE_ORDER", () => {
      const warnSpy = spyOn(console, "warn");

      // Orchestrator has extra stage not in resolver
      validateStageDrift([...STAGE_ORDER, "newOrchestratorStage"]);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Orchestrator has stage "newOrchestratorStage" not in STAGE_ORDER')
      );

      warnSpy.mockRestore();
    });

    it("warns when STAGE_ORDER has stage not in orchestrator", () => {
      const warnSpy = spyOn(console, "warn");

      // Orchestrator is missing a stage from STAGE_ORDER
      const partialStages = STAGE_ORDER.slice(0, -1); // Remove last stage
      validateStageDrift([...partialStages]);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not in orchestrator")
      );

      warnSpy.mockRestore();
    });

    it("only runs once per session", () => {
      const warnSpy = spyOn(console, "warn");

      // First call - should check
      validateStageDrift(["missingStage"]);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockClear();

      // Second call - should be no-op
      validateStageDrift(["anotherMissingStage"]);
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("can be reset with resetDriftCheck", () => {
      const warnSpy = spyOn(console, "warn");

      validateStageDrift(["missingStage"]);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockClear();
      resetDriftCheck();

      // After reset, should check again
      validateStageDrift(["anotherMissingStage"]);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
