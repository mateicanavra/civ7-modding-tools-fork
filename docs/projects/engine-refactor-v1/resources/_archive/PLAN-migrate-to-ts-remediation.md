MapGen TypeScript Migration Canvas

Status: Critical Architectural Pivot

Context: The "blind port" from JavaScript to TypeScript has succeeded in compilation but failed in runtime orchestration. The system compiles but produces no output ("Null Map Script") due to broken wiring between configuration, the adapter layer, and the engine.

1. The Canvas of Concerns

🔴 Core Architectural Problems & Code Smells

Structural issues where the current design actively prevents the system from working. These require redesign, not just patching.

Broken Dependency Injection (The Adapter Anti-Pattern)

The Issue: The MapOrchestrator attempts a dynamic require("./core/adapters.js") which does not exist in the build. It immediately falls back to createFallbackAdapter, which bypasses the architecture to access global GameplayMap/TerrainBuilder directly.

The Smell: The dedicated @civ7/adapter package—designed to be the single source of truth for engine interaction—is fully implemented but never instantiated in production.

Violation: MapOrchestrator.ts and placement.ts contain direct imports of /base-standard/..., violating the "Single Adapter Boundary" rule.

The Configuration "Air Gap"

The Issue: bootstrap() accepts simple stageConfig booleans (e.g., { foundation: true }), but the tunables module reads from a complex stageManifest object. There is no logic connecting the two.

The Result: stageEnabled('foundation') always returns false. The pipeline runs, checks every flag, sees them all as false, and exits successfully having done nothing.

Phantom Types & Stubs

The Issue: Layers like biomes.ts and features.ts define local interfaces (BiomeAdapter, FeaturesAdapter) that do not exist on the main EngineAdapter.

The Smell: To make this compile, the code uses local stubs that return -1 or no-op. The architecture allows layers to define requirements that the system does not actually satisfy.

Global Singleton Coupling

The Issue: Layers (mountains.ts, volcanoes.ts) import the WorldModel singleton directly rather than receiving data through the FoundationContext.

The Smell: This prevents testing layers in isolation (requires resetting global state) and defeats the purpose of the immutable context data flow.

Lifecycle State Leakage

The Issue: MapOrchestrator.generateMap() calls resetTunables() but never calls resetBootstrap() or WorldModel.reset().

The Risk: Multi-run sessions (or tests) can carry over stale config or world state, producing inconsistent or non-deterministic outputs.

🟡 Missing or Incomplete Implementations

Functionality that existed in JS but is currently absent.

Story Tagging Implementation: story/tagging.ts (Margins, Rifts, Hotspots logic) and story/corridors.ts (Sea Lanes) are missing. The data structures exist (StoryTags), but nothing populates them.

Base-Standard Integration: The logic to actually ask the engine simple questions (e.g., "What is the ID for Rainforest?" or "Can I place a reef here?") is stubbed out.

Preset Resolution: The classic and temperate presets were not ported. The system currently hardcodes map dimensions (84x54 in requestMapData) because it lacks the logic to look up map sizes from GameInfo.

Missing Utilities: Specific JS utilities isAdjacentToLand and getFeatureTypeIndex (engine-aware version) were not ported, forcing layers to use inferior local fallbacks or stubs.

🟠 Downstream Side-Effect Issues

Symptoms caused by the issues above.

Pipeline Silent Failure: The orchestrator reports success but generates nothing.

Climate Fidelity Loss: Two compounding issues:
- Missing Story Tags (Margins) means narrative-driven moisture adjustments never run.
- In climate-engine.ts, resolveAdapter() returns an adapter where isCoastalLand / isAdjacentToShallowWater are *present* but stubbed to always return false. Because the baseline/swatches passes check “if adapter.hasMethod, use it”, the local neighborhood fallbacks never execute. Even with a correct world model and no story, coastal/shallow gradients are effectively disabled.

Biomes & Features No-Op: In addition to the phantom adapter types, the orchestrator calls designateEnhancedBiomes(iWidth, iHeight) without passing ctx, forcing the biomes layer into its dummy adapter path. Features use an adapter that never calls base-standard addFeatures, never resolves getFeatureTypeIndex / biome globals correctly, and treats “no feature” as -1. Together, biomes and feature embellishments are effectively disabled against the real engine.

Unverified Feature Parity: We cannot verify parity with the JS version because we are effectively running a null script (stages disabled, story empty, biomes/features blocked by adapter stubs).

2. Strategic Pivot: Refactor vs. Port

To stabilize the build, we must stop "porting" complexity and start "redesigning" the flow for TypeScript strictness.

A. Simplify & Redesign (Immediate Priority)

Fix the plumbing so water flows.

Strict Adapter Injection:

Action: Remove all "fallback to global" logic inside layers. Layers must accept an ExtendedMapContext. The Adapter must be the Civ7Adapter.

Benefit: Deletes defensive code; enforces the architecture; fixes the boundary violation.

Configuration Interface:

Action: Drop the complex runtime resolver logic from JS. Define a strict MapConfiguration interface. The mod entry point (swooper-desert-mountains.ts) constructs this object typed.

Benefit: Closes the "Air Gap." If the config is valid TS, the pipeline runs.

WorldModel Context:

Action: Add worldModel to ExtendedMapContext. Layers read from ctx.worldModel. Remove import { WorldModel } from all layer files.

B. Port As-Is (Secondary Priority)

Fill in the missing logic once the plumbing works.

Story Algorithms: Port the math for hotspots and rifts directly from tagging.js.

Engine Wrappers: Implement the missing methods in Civ7Adapter by wrapping the engine scripts (do not rewrite designateBiomes from scratch). This includes:
- Biomes: delegate to Civ7’s biome generator (designateBiomes, biome globals, setBiomeType) and then layer TS nudges on top.
- Features: wire addFeatures, feature indices, biome globals, and the “no feature” sentinel via GameInfo / FeatureTypes.
- Late placement helpers: expose floodplains, fertility, resources, discoveries, and snow through the adapter rather than calling globals in layers.

Stage Manifest & Warnings: Reintroduce a minimal resolver (similar to the JS normalizeStageManifest) that:
- Builds a normalized manifest from defaults + presets + overrides.
- Evaluates requires/ordering and derives legacy toggles.
- Emits [StageManifest] warnings when overrides target missing or disabled stages.

Presets & Map Size: Restore the flow GameplayMap.getMapSize() → GameInfo.Maps.lookup() → map defaults. Even if we do not port every named preset, the orchestrator should not hard-code 84x54; dimensions and latitudes should come from the same place the JS version used.

Adapter-Bound Biomes/Features: Replace local stubs in biomes.ts / features.ts with calls into the adapter surface described above, so TS logic becomes a thin, testable layer on top of real engine behavior rather than a parallel, synthetic system.

3. Immediate Action Plan

Fix the Adapter: Modify MapOrchestrator to import and instantiate @civ7/adapter directly. Remove the dynamic require.

Fix the Config: Update bootstrap to either:
- Map simple stageConfig inputs into the stageManifest that tunables expects, or
- Accept a fully-typed MapConfiguration (including manifest) and drop hidden runtime “resolution” logic.

Verify Execution: Run the mod. It should now actually attempt to generate terrain (even if that terrain is ugly because of missing Story Tags).

4. Alternative Solutions Analysis

For each core architectural problem, we have multiple paths forward. We must choose the one that reduces complexity while ensuring stability.

Problem: The Configuration "Air Gap" (Stage Config vs. Manifest)

Why does the pipeline run but do nothing? Because A doesn't talk to B.

Option A: Patch (The Bridge)

Approach: Update bootstrap() or buildTunablesSnapshot() to manually translate the simple stageConfig object (booleans) into the complex StageManifest structure expected by the system.

Pros: Least code change; keeps existing structure.

Cons: Keeps the complexity of two different config formats (input vs. internal); essentially maintaining technical debt.

Option B: Simplify (Interface-Driven Config) [RECOMMENDED]

Approach: Define a strict TypeScript interface MapConfiguration. The mod entry point constructs this object fully typed (including the manifest). Drop the runtime "resolution" logic entirely.

Pros: Compiles = Works. Removes the "magic" resolution step. Leverages TS type checking. Directly supports the future "Pipeline Manifest" architecture (data-driven stages).

Cons: Entry point file becomes slightly more verbose.

Option C: Remove (Delete the Manifest)

Approach: Delete the concept of a "Stage Manifest" entirely. In the orchestrator, just check if (config.stages.foundation).

Pros: Drastically reduces complexity. We don't need a dependency graph for a linear script.

Cons: Loses future flexibility if we ever want dynamic stage reordering (YAGNI?). Moves backward toward procedural scripts, conflicting with the "Modular Map Pipeline" vision.

Problem: Broken Dependency Injection (Adapter Anti-Pattern)

Why is the Adapter package unused? Because the Orchestrator tries to dynamic-load it.

Option A: Patch (Dynamic Shim)

Approach: Fix the build config to ensure the adapter file exists where the dynamic require looks for it.

Pros: Preserves the dynamic loading pattern (if that was important).

Cons: Fragile; fights against the bundler (tsup); obscures dependencies.

Option B: Simplify (Constructor Injection)

Approach: Instantiate Civ7Adapter in the mod entry point (swooper-desert-mountains.ts) and pass it into new MapOrchestrator(adapter).

Pros: explicit ownership; bundler works automatically; zero magic. Tests can pass new MockAdapter().

Cons: API change for MapOrchestrator.

Option C: Remove (Static Import)

Approach: Just import { Civ7Adapter } inside MapOrchestrator.ts. Remove the configuration option to inject it.

Pros: Easiest to implement immediately.

Cons: Makes testing MapOrchestrator harder (can't easily swap mock); tightly couples core to Civ7 implementation.

Problem: Phantom Types & Stubs (Biomes/Features)

Why do we have code that does nothing? Because the interface doesn't match reality.

Option A: Patch (Direct Globals)

Approach: Fill in the stub functions in biomes.ts / features.ts by directly calling GameplayMap and TerrainBuilder globals.

Pros: Fastest "fix" to get behavior working.

Cons: Violates the "Adapter Boundary" architecture; makes code untestable outside the game.

Option B: Simplify (Extend Adapter)

Approach: Add the missing methods (designateBiomes, getFeatureTypeIndex, etc.) to the main EngineAdapter interface. Implement them in Civ7Adapter.

Pros: Keeps the architecture pure; keeps logic testable via mocks.

Cons: EngineAdapter interface grows large (Monolithic Adapter).

Option C: Redesign (Specialized Adapters)

Approach: Create separate BiomeProvider and FeatureProvider interfaces. Inject them into the context alongside the main adapter.

Pros: Clean separation of concerns.

Cons: Over-engineering for a map script? Increases boilerplate.

Problem: Global Singleton Coupling (WorldModel)

Why can't we test layers in isolation? Because they reach for global state.

Option A: Patch (Lifecycle Management)

Approach: Add explicit WorldModel.reset() calls in the Orchestrator and Test Setup.

Pros: Low effort.

Cons: Mutable global state is the root of all evil; race conditions in tests; hidden side effects.

Option B: Refactor (Pass Context)

Approach: Ensure FoundationContext (the immutable data snapshot) is populated in the MapContext. Update layers to read ctx.foundation.plates instead of importing WorldModel.

Pros: Functional purity; easy testing (just pass a mock object); decoupling.

Cons: Requires updating signatures in all layer files.

Option C: Remove (Pure Function)

Approach: Delete the WorldModel singleton object. Make generateFoundation(config) a pure function that returns the data arrays. Store that result in the context.

Pros: The "WorldModel" stops being a place that holds state and becomes just a calculation.

Cons: Major refactor of the world/ directory structure.

Problem: Voronoi Strategy (World vs Civ7 Fidelity)

Why is plate behavior hard to reason about vs the base game? Because the TS world implementation uses its own simplified Voronoi utility.

Option A: Accept Independent TS Voronoi (Documented Divergence)

Approach: Treat DefaultVoronoiUtils as the canonical implementation, optimize/test it locally, and clearly document that plate tessellation is intentionally independent from Civ7’s voronoi/kd-tree pipeline.

Pros: No hard runtime dependency on Civ7 internals; easier to test and evolve; fully controlled in this repo.

Cons: Harder to claim “bit-level parity” with Civ7 world generation; tuning may need to diverge from Civ defaults.

Option B: Adapter-Backed Voronoi (Delayed Integration)

Approach: Define a VoronoiUtilsInterface in world code and provide two implementations:
- A “production” implementation that calls Civ7’s /base-standard/voronoi-utils.js and kd-tree via the adapter.
- A “test” implementation (DefaultVoronoiUtils) used in unit tests and offline experiments.

Pros: Gives us true parity in production while maintaining testability; aligns with adapter boundary principles.

Cons: Requires more adapter plumbing; test vs runtime differences must be carefully managed/documented.

5. Testing & Diagnostics Remediation

We should treat testing and diagnostics as first-class remediation steps, not afterthoughts. The goal is to make the next set of regressions impossible to land silently.

Orchestrator + Stages Integration Test

Add a targeted test in mapgen-core that:
- Calls bootstrap({ stageConfig: { foundation: true, landmassPlates: true, ... } }).
- Instantiates MapOrchestrator with a MockAdapter from @civ7/adapter/mock.
- Runs generateMap() and asserts that:
  - Stage flags are correctly enabled/disabled.
  - At least a minimal subset of stages actually execute (e.g., landmassPlates, coastlines, mountains, placement).

This test should fail if the stage manifest wiring regresses again.

WorldModel Lifecycle Tests

Add focused tests for WorldModel:
- init() with explicit width/height and injected RNG should allocate and populate the core fields (plates, winds, currents, etc.).
- reset() should clear state in a way that makes back-to-back init() calls deterministic.
- setConfigProvider / getConfig() integration should be verified at least minimally.

Climate / Biomes / Features Behavior Tests

For climate:
- Use ExtendedMapContext + MockAdapter to assert that baseline bands, orographic bonuses, and coastal/shallow modifiers behave as expected on small grids.

For biomes:
- Provide a fake adapter that exposes biome reads/writes, and assert that tundra restraint, tropical coasts, river-valley grassland, and corridor/rift-shoulder rules fire when their conditions are met.

For features:
- Provide a fake adapter with concrete feature indices and biome globals, and assert that reef placement, volcanic forests/taiga, and density tweaks actually place features.

Adapter-Boundary Check

Implement a grep-based “adapter boundary” check and wire it into CI so that /base-standard/ imports in packages/** outside civ7-adapter cause a failure (excluding config/tests). This protects the boundary we are about to repair.

CIV‑8 In-Game Validation

Once the above wiring and tests are in place, re-run CIV‑8 with explicit, documented steps:
- Launch the game with the TypeScript build.
- Generate maps with the Swooper preset and collect:
  - Logs showing stage execution (Starting: landmassPlates, etc.).
  - Quick visual checks for coasts, mountains, rainfall belts, biomes, and features.
  - Comparisons vs a JS-baseline save or screenshots, at least at a qualitative level.

Document these observations in the CIV‑8 review so we have a concrete “TS parity achieved” checkpoint.

6. JS → TS Parity Matrix Second-Pass Remediation

Beyond the P0 remediation stacks captured in this canvas, we now track a dedicated JS → TS parity matrix that compares the archived JS mod against the current TypeScript mapgen core.

- Reference: [M-TS-parity-matrix.md](../resources/M-TS-parity-matrix.md) — canonical matrix of `Parity`, `Missing`, and `Detraction / Open` rows across story/corridors, bootstrap, world, and layers.
- Intent: Treat this as a **second-pass remediation** focused on:
  - Deciding, row by row, which `Detraction / Open` divergences are intentional evolutions to bless vs. regressions to fix.
  - Turning `Missing` rows (e.g., story tagging & corridors, presets/base config, adapter parity, volcano fallback, dev logging facades) into explicit CIV issues and/or follow-on remediation stacks.
- Current state: This second pass is **not yet decomposed into scoped sections or issue stacks**; we first need product/engineering decisions on desired parity vs. evolution. Until those decisions are made, the parity matrix stands as the central record of remaining migration work.
