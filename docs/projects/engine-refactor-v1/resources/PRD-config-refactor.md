# PRD: MapGen Configuration & Schema Refactor

## 1. Overview

This document defines the requirements for refactoring the **configuration system** that drives the map generation engine. It builds on the exploration in `SPIKE-config-refactor-design.md` and aligns it with:

- The **Task Graph / Pipeline** design (`PRD-pipeline-refactor.md`, `docs/system/libs/mapgen/architecture.md`).
- The **Foundation / Plate Generation** design (`PRD-plate-generation.md`, `docs/system/libs/mapgen/foundation.md`).

The goal is to move from the current multi-layer, global, tunables-driven config model to a **single validated schema** (`MapGenConfig`) with clear ownership, while sequencing implementation so that we:

1. First remove the most dangerous traps (globals, scattered defaults, multi-merge) in a **hygiene pass** that remains compatible with the current orchestrator.
2. Then align config usage with the new **Task Graph / Foundation pipeline**.
3. Finally reshape the external config surface and mod entrypoints to match the long-term architecture (flat, recipe-friendly, per-step config).

**Status (M2):** Phase 1 (“config hygiene”) is now implemented: configs are validated via `parseConfig()` and injected into the orchestrator (no `globalThis.__EPIC_MAP_CONFIG__`). Remaining phases in this PRD describe the *future* shape evolution and pipeline integration work (M3+).

---

## 2. Problem Statement

The current configuration system (as described in `SPIKE-config-refactor-design.md`) has several issues:

1. **Over-indirection & confusion**
   - Multiple layers: `BootstrapOptions.overrides` → `MapConfig` in `globalThis` → `getConfig()` → `buildTunablesSnapshot()` → `FOUNDATION_CFG`/`CLIMATE_CFG` → per-layer option builders.
   - Config “flows” are hard to reason about; it is unclear where defaults are applied and which values win.

2. **Scattered types & defaults**
   - Types spread across `bootstrap/types.ts`, layer-local interfaces, and implicit shapes in tunables.
   - Defaults repeated in types, tunables, and layer functions (e.g., `buildMountainOptions()` plus inline defaults inside `layerAddMountainsPhysics()`).

3. **Global state & bootstrap coupling**
   - Pre-M2: Config stored and merged via globals (`globalThis.__EPIC_MAP_CONFIG__`) and bootstrap helpers.
   - This conflicts with the pipeline architecture, which expects explicit `MapGenContext.config` injected at the boundary.

4. **Weak runtime validation**
   - Most validation is compile-time only; invalid configs can slip through and cause subtle runtime failures.
   - Some invalid shapes are silently “fixed” by deep merges and defaulting rather than failing fast.

5. **Tunables indirection**
   - `bootstrap/tunables.ts` produces a `TunablesSnapshot` (`FOUNDATION_CFG`, `CLIMATE_CFG`, `STAGE_MANIFEST`, etc.), but adds indirection rather than strong guarantees.
   - Tunables also carry legacy facades that are only partially used in TS (e.g., story/corridors config without story stages).

These issues are already painful in the current orchestrator and will become **actively dangerous** if we drag them unchanged into the new Task Graph and Foundation pipeline. We need a configuration model that matches the engine’s **explicit, fail-fast, context-oriented** design.

---

## 3. Goals

1. **Single Source of Truth**
   - Define `MapGenConfig` once, in one place, as the canonical schema for map configuration.
   - Use this schema to generate both runtime validation and TypeScript types.

2. **Runtime-validated, fail-fast config**
   - All configs entering the engine must pass schema validation (with clear error messages) before any generation work runs.
   - Invalid configs should fail fast, not be silently coerced or partially ignored.

3. **Explicit ownership & no globals**
   - Configuration must be **injected** at the orchestrator/pipeline boundary (e.g., `new MapOrchestrator(rawConfig)` / `PipelineExecutor.run(context, recipe, config)`).
   - `MapGenContext` should expose `config: MapGenConfig` – there is no global config store.

4. **Clear layering & testability**
   - Layers and steps receive config via parameters or `context.config`, not via globals or ad-hoc `getTunables()` lookups.
   - Tests can easily supply configs without mocking global state.

5. **JSON-schema-compatible**
   - The schema should be convertible to JSON Schema for editor tooling, docs, and potential external validation.

6. **Sequenced refactor**
   - Phase 1: **Hygiene** – make the current shape safer without reshaping everything.
   - Later phases: **Shape evolution** – align the config surface with the Task Graph and Foundation design (flat structure, per-step config, recipes).

---

## 4. Scope & Non-Goals

**In-scope**
- Core mapgen config consumed by:
  - `packages/mapgen-core/src/MapOrchestrator.ts`
  - `packages/mapgen-core/src/bootstrap/tunables.ts`
  - Foundation/plates (`world/`, `layers/landmass-plate.ts`, etc.).
  - Terrain/climate/biomes/features/placement layers (`layers/*.ts`).
- The config surface used by the TS Swooper maps entry scripts (map scripts that bootstrap `mapgen-core`).
- Definition and loading of `MapGenConfig` for the new pipeline (`MapGenContext.config`).

**Out of scope (for this PRD)**
- UI/editor representation of config (beyond JSON schema export).
- Broader Civ7 mod configuration outside the mapgen engine.
- Implementing every future “recipe” concept – this PRD focuses on the engine-side config schema needed for mapgen.

---

## 5. Architecture & Relationships

### 5.1. MapGenConfig vs Pipeline Recipe

The engine will be driven by two related but distinct inputs:

1. **MapGenConfig** (this PRD)
   - Describes *parameters* for the engine: plate counts, landmass water percentage, mountains/volcano tuning, climate refinements, story/corridor options, diagnostics toggles, etc.
   - Must be validated and available via `MapGenContext.config`.

2. **Pipeline Recipe** (see `PRD-pipeline-refactor.md`)
   - Describes *which steps run in which order* and with which per-step overrides.
   - Example: list of `{ step: "core.mesh.voronoi", config: { cellCount: 4000 } }`.

In v1 of this refactor:
- `MapGenConfig` remains the primary input for behavior.
- ~~The pipeline recipe may be implicit (standard pipeline) or partially derived from config.~~  
  **Update (2025-12-21, M4 planning):** The standard pipeline is an explicit mod package + recipe; it is not derived from config. See `../milestones/M4-tests-validation-cleanup.md`.
- Later, we may expose recipes to map scripts and UIs; this PRD ensures the configuration model is ready for that future.

### 5.2. Schema & Validation Technology

We will follow the pattern from `SPIKE-config-refactor-design.md`, adapted to the current architecture:

- Use **TypeBox** (`@sinclair/typebox`) to define the config schema, with:
  - `MapGenConfigSchema` as the root.
  - Derived TypeScript types via `Static<typeof MapGenConfigSchema>`.
- Use `TypeCompiler` + `Value` utilities for:
  - Applying defaults (Clone → Default → Convert → Clean).
  - High-performance validation.
- Export helpers:
  - `parseConfig(input: unknown): MapGenConfig` — throws on validation failure.
  - `safeParseConfig(input: unknown): { success: true; config } | { success: false; errors }`.
  - `getDefaultConfig(): MapGenConfig`.
  - `getJsonSchema(): object` — for external tooling.

This choice is compatible with the Task Graph and Foundation PRDs:
- Config validation happens at the **engine boundary**, not per-step.
- Steps can still define narrower per-step schemas if needed, but that is outside the scope of this PRD.

### 5.3. Relationship to Foundation / Plate Generation

`docs/system/libs/mapgen/foundation.md` defines a conceptual `PlateGenerationConfig`. Under this PRD:

- `PlateGenerationConfig` becomes a **sub-schema** inside `MapGenConfig` (e.g., `config.foundation` or `config.plates`/`config.tectonics`, depending on final naming).
- The Foundation pipeline (mesh → crust → partition → physics) reads from `MapGenContext.config` using these sub-schemas.
- This PRD does **not** change the mathematical design of foundation; it only standardizes how its parameters are provided and validated.

---

## 6. Implementation Phases

### Phase 1: Config Hygiene (Required for other PRDs)

**Objective:** Make the *existing* config model safer and explicit, without reshaping the public surface. This phase is a prerequisite for the rest of the engine refactor work.

**Requirements**

1. **Schema for current shape**
   - Define a `MapGenConfigSchema` that describes the current, effective config:
     - Preserve current nesting (including `foundation` group and `FOUNDATION_CFG` structure) as needed to avoid breaking map scripts.
     - Include all fields currently consumed by tunables and layers (landmass, mountains, volcanoes, climate, story, corridors, placement, diagnostics/stage manifest).
   - Derive `MapGenConfig` type from the schema.

2. **Single loader**
   - Implement `config/loader.ts` in `mapgen-core` with:
     - `parseConfig(input)` (clone + default + convert + clean + validate).
     - `safeParseConfig`, `getDefaultConfig`, `getJsonSchema`.
   - Replace ad-hoc merge logic in bootstrap/entry code with a call to `parseConfig`.

3. **No global config store**
   - Remove `globalThis.__EPIC_MAP_CONFIG__` and similar global config slots.
   - Ensure `MapOrchestrator` (and any other entry) receive config via constructor or method parameter:
     - Example: `new MapOrchestrator(rawConfig, adapter)` internally calls `parseConfig(rawConfig)`.

4. **Tunables as a view over schema**
   - Update `bootstrap/tunables.ts` so that:
     - It builds its snapshot from a `MapGenConfig` instance, not from loosely-typed config and globals.
     - It stops applying its own defaults where those defaults can be expressed in the schema.
   - Keep the **public tunables surface** (e.g., `FOUNDATION_CFG`, `CLIMATE_CFG`, `STAGE_MANIFEST`) as-is to avoid breaking existing layers in this phase.

5. **Fail-fast behavior**
   - Ensure `parseConfig` throws on invalid config (wrong types, out-of-range values, unknown keys not explicitly allowed).
   - Ensure `MapOrchestrator` construction (or engine entrypoint) fails early on invalid config, with a clear error message.

6. **Backward compatibility**
   - Map existing mod config shapes into the schema (including any `foundation` nesting) so current Swooper map scripts do not need to change immediately.
   - Document any intentional differences from legacy behavior (e.g., cases where we previously silently corrected invalid configs that now fail validation).

**Deliverables**

- `MapGenConfigSchema` and `MapGenConfig` type in `packages/mapgen-core/src/config/schema.ts`.
- Loader and helpers in `packages/mapgen-core/src/config/loader.ts`.
- Updated `MapOrchestrator` and `bootstrap/tunables.ts` to consume validated config instead of globals.
- Documentation updates:
  - `docs/system/libs/mapgen/architecture.md` (Config section).
  - This PRD linked from `PRD-pipeline-refactor.md` and `PRD-plate-generation.md` as a dependency.

**Notes**

- Schema is authored with `@sinclair/typebox` under `packages/mapgen-core/src/config/schema.ts`, with sub-schemas for foundation, landmass, climate, and layer-level tuning.
- Landmass shaping semantics (water scaling, boundary biasing, boundary share backstop) are documented inline in the schema; use those comments when adjusting water targets or margin hugging behavior.
- Phase 1 is intentionally **conservative**: we keep the shape mostly as-is and do not yet flatten or re-group config.
- It is the minimum required to support the Fail Fast policy and avoid carrying brittle config flows into the new pipeline.

---

### Phase 2: Pipeline & Foundation Integration

**Objective:** Align config usage with the Task Graph and Foundation pipeline, while still preserving external-facing shape for Swooper map scripts.

**Requirements**

1. **MapGenContext integration**
   - Extend `MapGenContext` (see `docs/system/libs/mapgen/architecture.md`) to include:
     - `config: MapGenConfig` (validated).
   - Ensure the pipeline executor and/or `MapOrchestrator` populate `context.config` once at the start.

2. **Foundation config alignment**
   - Map the `PlateGenerationConfig` described in `docs/system/libs/mapgen/foundation.md` to a concrete sub-schema within `MapGenConfig`.
   - Foundation steps read their parameters from `context.config` (via either:
     - a dedicated helper, or
     - direct access to the relevant sub-schema).

3. **Step-level config strategy**
   - Decide on a convention for how steps read config:
     - Option A: Steps read directly from `context.config` (e.g., `context.config.plates`, `context.config.landmass`).
     - Option B: Steps accept a narrow config slice passed via pipeline recipe, with defaults coming from `MapGenConfig`.
   - This PRD does not require full per-step schemas, but the convention must be consistent with `PRD-pipeline-refactor.md`.

4. **Fail-fast dependency enforcement**
   - Ensure steps that require config explicitly declare it (e.g., via their `requires` metadata or documentation) and that missing config is treated as an error rather than silently skipped.

**Deliverables**

- Updated `MapGenContext` type and engine initialization.
- Foundation implementation wired to `MapGenConfig`.
- Documentation updates in:
  - `docs/system/libs/mapgen/architecture.md` (MapGenContext, config usage).
  - `docs/system/libs/mapgen/foundation.md` (relationship between `PlateGenerationConfig` and `MapGenConfig`).

---

### Phase 3: Config Shape Evolution & Tunables Retirement

**Objective:** Evolve the external config surface and engine internals to match the long-term architecture, and retire legacy tunables.

**Requirements**

1. **Flatten and rationalize config shape**
   - Move away from legacy nested patterns (e.g., `foundation.mountains`) toward a more explicit, step-aligned shape, such as:
     - Top-level `plates`, `landmass`, `mountains`, `volcanoes`, `climate`, `story`, `corridors`, `placement`, `diagnostics`, etc.
   - Align naming and grouping with the Task Graph phases (`setup`, `foundation`, `morphology`, `hydrology`, `ecology`, `placement`) and key steps.

2. **Tunables retirement**
   - Gradually refactor layers and steps to:
     - Read from `context.config` (or explicit per-step config) instead of `FOUNDATION_CFG`/`CLIMATE_CFG`.
   - Once all major consumers are off tunables, remove:
     - `bootstrap/tunables.ts` (or reduce it to a minimal compatibility shim).
     - Legacy tunables facades that are no longer needed.

3. **Map script & preset updates**
   - Update Swooper and other TS map scripts to provide config in the new shape.
   - For backwards compatibility, provide a thin adapter that maps old-config shapes into the new schema for a transitional period (if needed).

4. **Documentation & tooling**
   - Update docs and examples to show the new config structure.
   - Use `getJsonSchema()` to generate JSON Schema for:
     - Docs under `docs/system/libs/mapgen/`.
     - Potential editor integrations.

**Deliverables**

- Revised `MapGenConfigSchema` (flattened/evolved shape).
- Removal or drastic reduction of tunables.
- Updated map scripts, docs, and examples.

**Note:**  
Phase 3 should be scheduled **after** the core Task Graph and Foundation work are stable, to avoid reshaping config in the dark.

---

## 7. Rationale for Sequencing

This PRD is explicitly sequenced to support and de-risk the other engine refactors:

1. **Phase 1 (Hygiene) is a dependency for:**
   - `PRD-pipeline-refactor.md` — the Task Graph expects explicit, injected config and Fail Fast behavior. Phase 1 provides a single validated schema and removes globals before we build the pipeline.
   - `PRD-plate-generation.md` — the Foundation stage depends on stable plate/tectonics config. Phase 1 ensures those parameters come from a known, validated source.

2. **Phase 2 aligns config usage with the new architecture:**
   - It embeds `MapGenConfig` into `MapGenContext` and connects the Foundation pipeline to the schema, without forcing immediate external shape changes.

3. **Phase 3 takes advantage of the new architecture:**
   - Once steps and phases are real and we can see which knobs actually matter, we evolve the config shape and retire tunables with much higher confidence and less churn.

This sequencing balances:
- The desire to **avoid dragging legacy traps** into new engine work.
- The need to avoid doing a large, speculative config reshaping before the Task Graph and Foundation are concretely implemented.

Milestone-level scheduling for these phases is maintained in the engine-level project
brief (`PROJECT-engine-refactor-v1.md`) and the milestone docs (for example,
`milestones/M2-stable-engine-slice.md` and `../../../_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`).

---

## 8. Open Questions & Considerations

1. **Per-step schemas vs global schema only**
   - Do we want each `MapGenStep` to define its own schema, validated at the step boundary (e.g., via a lightweight contract helper), or is the global `MapGenConfig` schema sufficient?
   - For now, this PRD assumes **global schema only**, with optional per-step validation as a future enhancement.

2. **Config vs recipe responsibility**
   - Which aspects belong in `MapGenConfig` (engine parameters) vs the pipeline recipe (step selection/order)?
   - Initial guidance: MapGenConfig covers *parameters*; the recipe covers *which steps run* and *in what order*. This line may blur for some toggles (e.g., stage enable/disable).

3. **Story/corridors config timing**
   - `SPIKE-config-refactor-design.md` and the parity matrix call out story/corridor config surfaces that currently have no TS implementation.
   - We want to:
     - Include the necessary fields in the schema in Phase 1 (for compatibility).
     - Implement **minimal story parity** (margins/hotspots/rifts ± orogeny) under the existing orchestrator in M2 so these knobs become real and consumers stabilize.
     - Treat the remaining story/corridors surfaces (corridors, swatches, paleo, canonical overlays) as “config for not‑yet‑implemented steps” until they are migrated into the Task Graph in M3.

4. **Backward compatibility window**
   - How long do we support old config shapes via adapters once the new shape is in place?
   - This should be decided in coordination with downstream mod authors and the broader engine roadmap.

These questions should be revisited after Phase 1 and Phase 2 are complete and the Task Graph / Foundation pipeline are running against `MapGenConfig`.
