# Story Drift + Legacy Path Removal (MapGen Core)

> **Status**: SPIKE complete → PRD for implementation
> **Verdict**: Feasible, high-leverage to do now
> **Related**: `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`

---

# Part A: Context & Design

## 1. Summary

Remove the legacy orchestration path and legacy compatibility surfaces from `@swooper/mapgen-core`, making TaskGraph the sole execution path. With story logic now modularized and shared across pipeline steps + domain modules, the dominant drift vector is keeping multiple orchestration paths and legacy compatibility surfaces alive. Given that we control all consumers, it's practical to remove the legacy orchestrator path and the legacy story toggle surface in the same stack, while explicitly deferring only true behavior-mode selectors (e.g. `"legacy" | "area"` algorithm modes).

**Core insight**: Eliminating the orchestration fork + legacy config surfaces removes the primary structural source of drift and sharply reduces ongoing migration overhead.

---

## 2. Problem Statement

### 2.1 What "Legacy" Means Here

- **Legacy orchestrator path**: `MapOrchestrator.generateMap()`'s inline stage runner (including inline story stages), selected when `OrchestratorConfig.useTaskGraph !== true` (`packages/mapgen-core/src/MapOrchestrator.ts`, `generateMap()`).
- **TaskGraph path**: `PipelineExecutor + StepRegistry` execution from `MapOrchestrator.generateMapTaskGraph()` (`packages/mapgen-core/src/MapOrchestrator.ts`, `generateMapTaskGraph()`), used when `useTaskGraph: true`.
- **Legacy compatibility surfaces** (separate from orchestration):
  - Legacy story enablement toggles (`config.toggles.STORY_ENABLE_*`) that mirror old JS-era switches (`packages/mapgen-core/src/config/schema.ts`, `TogglesSchema`).
  - Legacy step/shim exports (`packages/mapgen-core/src/steps/*`, `createLegacy*Step`) and a legacy placement step type (`packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts`).
  - Legacy bootstrap input shapes (e.g., `bootstrap()`'s `BootstrapConfig.stages` "legacy interface" in `packages/mapgen-core/src/bootstrap/entry.ts`).

### 2.2 Why Drift Is Structurally Inevitable

Two orchestration paths exist today:

- Branching entrypoint: `packages/mapgen-core/src/MapOrchestrator.ts` (`generateMap()` checks `options.useTaskGraph`).
- Legacy inline story stages live in the legacy runner:
  - `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridorsPre` (`packages/mapgen-core/src/MapOrchestrator.ts:553-636`)
  - `storySwatches` + paleo-in-rivers + `storyCorridorsPost` (`packages/mapgen-core/src/MapOrchestrator.ts:741-823`)
- Equivalent pipeline story steps exist:
  - `packages/mapgen-core/src/pipeline/narrative/*`
  - Example parity: `StorySeedStep` resets story state and runs `storyTagContinentalMargins`, matching the legacy stage body (`packages/mapgen-core/src/pipeline/narrative/StorySeedStep.ts:20-46`).

### 2.3 Story Modularization Increases the Cost of Keeping Legacy

The modularization work reduced "two story implementations" drift, but it increased the architectural drift cost of keeping two orchestrators alive:

- The M4 design locks the invariant: **reset story globals once per generation at the orchestrator boundary**, not inside story stages that can be disabled (`docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`, "Story/Playability Steps").
- TaskGraph implements that invariant: `generateMapTaskGraph()` resets story globals once per run before executing the recipe (`packages/mapgen-core/src/MapOrchestrator.ts`, `generateMapTaskGraph()`).
- Legacy path still resets primarily inside the `storySeed` stage (and other story stages), so disabling `storySeed` can re-introduce cross-run leakage and violate the intended "story is optional" contract (`packages/mapgen-core/src/MapOrchestrator.ts`, legacy inline runner).

---

## 3. Assumptions & Unknowns

### 3.1 Assumptions

- There are no external, uncontrolled consumers relying on legacy stage order/behavior; the only risk is internal breakage.
- "Target architecture" is the M3+ pipeline model: domain algorithms in `domain/**`, wiring in `pipeline/**`, and story/playability steps remaining optional and ultimately extractable (matches `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`).

### 3.2 Unknowns (that affect feasibility and rollout risk)

- Whether any out-of-repo consumers already rely on `OrchestratorConfig.useTaskGraph`, legacy `generateMap()` semantics, or the `config.toggles.STORY_ENABLE_*` surface (none found in-repo beyond tests/mods/docs, but this can't be proven from a workspace scan).
- Whether we still need an independent, non-legacy equivalent of "paleo enabled" separate from stage gating (see "Open Questions").

---

## 4. Architectural Decisions (Locked)

We're aligned on a pragmatic "canonical path now, refactor details later" approach:

| Decision | Detail |
|----------|--------|
| **Canonical execution** | TaskGraph is the only supported orchestration path; legacy `generateMap()` inline runner is removed. |
| **Canonical enablement** | Stage enablement is driven only by `stageManifest` (resolved from `stageConfig` via `bootstrap()`). The legacy story toggle surface (`config.toggles.STORY_ENABLE_*`) is removed entirely; we are not optimizing for internal toggling right now. |
| **Paleo gating** | Paleo runs whenever its config exists (no independent toggle). Concretely: if `climate.story.paleo` is present, we attempt to apply paleo effects (and it naturally no-ops when config is missing). |
| **Validation bar** | Prioritize "loads + no obviously missing major stage" over visual parity; existing step-level validation + smoke checks are sufficient for this removal pass. |
| **Story globals (temporary)** | We accept keeping StoryTags and related caches global temporarily to keep scope bounded while we delete legacy orchestration + toggles. |
| **Story globals (end-state)** | We explicitly intend to gut globals by the end, aligning all consumers on context-owned artifacts/overlays (and/or a context-owned story state object). This is the "last thing we do" in this initiative, after the legacy fork is gone. |

**Rationale**: Eliminating the orchestration fork + legacy config surfaces removes the primary structural source of drift and sharply reduces ongoing migration overhead.

---

## 5. Target End-State

- **Single orchestrator path**: `MapOrchestrator.generateMap()` is TaskGraph-only; no inline legacy stage runner exists; `OrchestratorConfig.useTaskGraph` does not exist.
- **Single enablement surface**: stage enablement is expressed only via `stageConfig/stageManifest` (resolved by `bootstrap()`), not via legacy story toggle mirrors.
- **Story optionality is structural**:
  - Disabling story stages never re-introduces state leakage (globals reset per run at the orchestrator boundary).
  - Downstream steps that "benefit from story" use the presence/absence of story artifacts/tags/config as their primary signal, not an independent legacy toggle surface.
- **Paleo has no legacy switch**: paleo is driven by config presence (e.g. `climate.story.paleo`), not `STORY_ENABLE_PALEO`.
- **No legacy shims in the public API**: remove `createLegacy*Step` aliases and legacy bootstrap config shapes that only exist for historical callers.
- **End-state story state is context-owned** (after the final step in this initiative): no module-level narrative registries/caches are required for correctness; all cross-stage "story" data is carried via context artifacts/overlays (or a context-owned story state object) and referenced explicitly by consumers.

---

## 6. Scope Boundaries

### 6.1 Goals (In Scope)

- Remove legacy orchestration path and make `generateMap()` TaskGraph-only
- Remove legacy story toggle surface (`config.toggles.STORY_ENABLE_*`)
- Remove legacy shims (`createLegacy*Step`, `LegacyPlacementStep`, legacy bootstrap shapes)
- Migrate downstream gating to canonical signals (stage enablement, config presence, artifact/tag presence)
- Align presets and docs with the new contract

### 6.2 Non-Goals (Explicit Deferrals)

**Intent**: Remove legacy *compatibility* surfaces, but do not rename/remove "legacy" *behavior modes* that are part of algorithm semantics today.

Examples to defer (non-exhaustive):

- Algorithm mode selectors like `"legacy" | "area"` (e.g. landmask/crust behavior in `packages/mapgen-core/src/config/schema.ts` and `packages/mapgen-core/src/domain/morphology/landmass/crust-mode.ts`).

**Trigger to revisit**: Once we have confidence that internal consumers no longer need to compare/validate "legacy vs area" behavior (e.g., parity matrices stabilized or the team decides one mode is canonical and deletes the other).

**Other legacy surfaces noticed** (not behavior modes):

- Deprecated top-level diagnostics toggles are still present in config schema as "[legacy/no-op]" (`packages/mapgen-core/src/config/schema.ts`, `DiagnosticsConfigSchema`). If the goal is "no legacy config surface at all", these can likely be removed in the same initiative, but they are not directly tied to story drift.

---

## 7. Current State Analysis

### 7.1 Internal Consumers (What Actually Needs Migration)

Workspace scan suggests there are only three meaningful categories of "internal consumers" to migrate off legacy:

- **Mods (TypeScript sources):**
  - TaskGraph enabled: `mods/mod-swooper-maps/src/swooper-earthlike.ts` (`useTaskGraph: true`).
  - Legacy path: `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` (no `useTaskGraph`).
- **Tests:** multiple orchestrator tests call `generateMap()` without `useTaskGraph`, so they currently exercise legacy by default (e.g. `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts`).
- **Docs/examples:** a few docs still imply legacy control surfaces / patterns (e.g. `docs/system/mods/swooper-maps/architecture.md`).

Note: built artifacts under `mods/mod-swooper-maps/mod/maps/*.js` also contain legacy strings, but these are generated outputs and are not treated as meaningful "consumers" (they can be regenerated after source updates).

### 7.2 Pipeline Ordering + Stage Enablement (Strong Foundation)

- Canonical stage order is centralized in `STAGE_ORDER` (`packages/mapgen-core/src/bootstrap/resolved.ts`).
- `bootstrap()` resolves `stageConfig -> stageManifest`, so stage enablement has a canonical representation by default (`packages/mapgen-core/src/bootstrap/entry.ts`).
- TaskGraph executes `StageManifest.order` filtered by enablement (`packages/mapgen-core/src/pipeline/StepRegistry.ts`).
- TaskGraph adds guardrails via requires/provides validation (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`).

### 7.3 Story Enablement Is Still Represented Twice

We have a canonical "what stages are enabled" representation (the resolved `stageManifest`), but legacy toggles still exist as an authored config surface and are consumed in domain logic.

- Stage gating is derived from `stageManifest` (`packages/mapgen-core/src/MapOrchestrator.ts`, `resolveStageFlags()`).
- `MapOrchestrator` derives and overwrites story-related toggles when constructing `context.config` (`packages/mapgen-core/src/MapOrchestrator.ts`, `buildContextConfig()`).
- Downstream logic still reads `config.toggles.STORY_ENABLE_*` directly:
  - Features: `packages/mapgen-core/src/domain/ecology/features/index.ts` gates some effects via `STORY_ENABLE_HOTSPOTS` even though it also checks story tag sets.
  - Biomes: `packages/mapgen-core/src/domain/ecology/biomes/index.ts` gates rift shoulder bias via `STORY_ENABLE_RIFTS`.
  - Climate refine: `packages/mapgen-core/src/domain/hydrology/climate/refine/orogeny-belts.ts` gates refinement via `STORY_ENABLE_OROGENY`.
  - Paleo is gated in the rivers step via a toggle (`packages/mapgen-core/src/pipeline/hydrology/index.ts`).
- Presets set story toggles but do not enable story stages by default, which is a confusing contract if `stageManifest` is intended to be authoritative (`packages/mapgen-core/src/config/presets.ts`).

Also: `StageDescriptorSchema` includes `legacyToggles` metadata (`packages/mapgen-core/src/config/schema.ts`) but there are no in-repo reads of that field today. That "half-bridge" is drift bait: it suggests canonical mapping exists, but it currently doesn't.

### 7.4 Other Legacy Compatibility Surfaces (Removable Now)

- `packages/mapgen-core/src/steps/index.ts` re-exports `createLegacyBiomesStep`, `createLegacyFeaturesStep`, `createLegacyPlacementStep` (thin aliases over pipeline steps).
- `packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts` exists and is exercised by tests (`packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`), even though the standard pipeline uses `createPlacementStep` (`packages/mapgen-core/src/pipeline/placement/index.ts`).
- `bootstrap()` still types a legacy `BootstrapConfig.stages` object (commented as "legacy interface") in `packages/mapgen-core/src/bootstrap/entry.ts`; no in-repo callsites were found using this surface.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Internal breakage** is expected | Any internal mod/config relying on legacy behavior must be migrated in lockstep. |
| **Config semantic ambiguity** is the biggest footgun | Presets and runtime toggle-derivation currently send mixed signals; clean up in same pass. |
| **Global story state remains a drift risk until the last step** | As long as tags/overlays/caches can be read from module-level singletons, we can still accidentally couple stages or satisfy dependencies via stale global state. Addressed in final phase. |
| **Hidden consumers** are the only meaningful external risk | If the repo is not yet published for modders, this is likely low. |

---

## 9. Open Questions

### 9.1 Resolved

- We will keep `generateMap()` as the stable entrypoint but make it TaskGraph-only.
- Paleo runs whenever its config exists; no independent enablement switch is retained.

### 9.2 Remaining (affects "last step" scope)

1. **What is the canonical context-owned representation for story tags and caches?**
   - Option A: an explicit `artifact:storyTags` / `artifact:storyState` value published by story steps and consumed by later steps.
   - Option B: a typed `ctx.story.*` object (parallel to `ctx.overlays` / `ctx.artifacts`) owned by the context factory.

2. **For overlays specifically**: should the pipeline consider overlays an artifact only when `ctx.overlays.size > 0`, or do we want a stable "overlay registry exists but empty" representation that still satisfies dependency tags without relying on a global fallback?

---

# Part B: Implementation Manifest

## 1. Deletion Manifest

### 1.1 Orchestration Switch + Duplicate Runner

- [ ] `OrchestratorConfig.useTaskGraph` option (`packages/mapgen-core/src/MapOrchestrator.ts`)
- [ ] `generateMap()` branch that selects between two orchestrators (`packages/mapgen-core/src/MapOrchestrator.ts`)
- [ ] Legacy inline stage runner blocks inside `generateMap()` (including inline story stages)

### 1.2 Legacy Story Toggle Surface

- [ ] `config.toggles.STORY_ENABLE_*` from config schema (`packages/mapgen-core/src/config/schema.ts`)
- [ ] `config.toggles.STORY_ENABLE_*` from presets (`packages/mapgen-core/src/config/presets.ts`)
- [ ] Toggle-derivation bridge in `MapOrchestrator.buildContextConfig()` (`packages/mapgen-core/src/MapOrchestrator.ts`)
- [ ] Downstream toggle-based gating in non-story code paths:
  - [ ] `packages/mapgen-core/src/domain/ecology/features/index.ts` (`STORY_ENABLE_HOTSPOTS`)
  - [ ] `packages/mapgen-core/src/domain/ecology/biomes/index.ts` (`STORY_ENABLE_RIFTS`)
  - [ ] `packages/mapgen-core/src/domain/hydrology/climate/refine/orogeny-belts.ts` (`STORY_ENABLE_OROGENY`)
  - [ ] `packages/mapgen-core/src/pipeline/hydrology/index.ts` (paleo toggle)

### 1.3 Dead / Half-Migrated Metadata

- [ ] `StageDescriptorSchema.legacyToggles` (`packages/mapgen-core/src/config/schema.ts`)

### 1.4 Legacy Shims / Re-export Surfaces

- [ ] `packages/mapgen-core/src/steps/*` legacy step aliases (`createLegacyBiomesStep`, `createLegacyFeaturesStep`, `createLegacyPlacementStep`)
- [ ] `packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts`
- [ ] Tests using legacy placement step (`packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`)

### 1.5 Legacy Bootstrap Input Shapes

- [ ] `BootstrapConfig.stages` legacy interface (`packages/mapgen-core/src/bootstrap/entry.ts`)

---

## 2. Phase Roadmap

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| **Phase 1** | Migrate all in-repo callsites and tests to TaskGraph-only | None |
| **Phase 2** | Make `generateMap()` TaskGraph-only; remove `useTaskGraph`; delete legacy inline runner | Phase 1 |
| **Phase 3** | Remove legacy story toggle surface; migrate gating to canonical signals | Phase 2 |
| **Phase 4** | Remove legacy shims (`createLegacy*Step`, `LegacyPlacementStep`, dead metadata) | Phase 3 |
| **Phase 5** | Align presets and docs with new contract | Phase 4 |
| **Phase 6** | Validation pass (smoke tests, step-level validation) | Phase 5 |
| **Phase 7** | Remove story module-level globals; migrate to context-owned data | Phase 6 |

---

## 3. Migration Checklists

### 3.1 Mods Migration

- [ ] `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` — add `useTaskGraph: true` (or remove option once default)
- [ ] `mods/mod-swooper-maps/src/swooper-earthlike.ts` — already enabled; remove explicit `useTaskGraph` once default
- [ ] Regenerate built artifacts under `mods/mod-swooper-maps/mod/maps/*.js`

### 3.2 Tests Migration

- [ ] `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts` — update to TaskGraph path
- [ ] `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` — migrate off `LegacyPlacementStep`
- [ ] Audit other orchestrator tests calling `generateMap()` without `useTaskGraph`

### 3.3 Docs Migration

- [ ] `docs/system/mods/swooper-maps/architecture.md` — remove legacy control surface references

### 3.4 Downstream Gating Migration

For each downstream toggle consumer, migrate to one of:
- **Stage enablement**: check `stageManifest` or stage flags
- **Config presence**: check if relevant config section exists (e.g. `climate.story.paleo`)
- **Artifact/tag presence**: check story overlays/tags directly

| File | Current Toggle | Migration Strategy |
|------|----------------|-------------------|
| `domain/ecology/features/index.ts` | `STORY_ENABLE_HOTSPOTS` | Check story tag sets (already partially done) |
| `domain/ecology/biomes/index.ts` | `STORY_ENABLE_RIFTS` | Check story tag sets |
| `domain/hydrology/climate/refine/orogeny-belts.ts` | `STORY_ENABLE_OROGENY` | Check story tag sets or stage flag |
| `pipeline/hydrology/index.ts` | Paleo toggle | Check `climate.story.paleo` config presence |

---

## 4. Validation Checklist

**Bar**: "loads + no obviously missing major stage" (not visual parity)

- [ ] All mods load without error
- [ ] All orchestrator tests pass
- [ ] No major stage missing from output (spot-check map generation)
- [ ] Existing step-level validation passes
- [ ] Smoke tests pass

---

## 5. Implementation Notes

### 5.1 Why TaskGraph Has Stronger Guardrails

- Keeping multiple orchestrators guarantees drift: any change to stage order, resets, artifacts, or "story optionality" must be implemented twice.
- With story now modularized and shared across pipeline wiring + domain components, the dominant remaining drift is configuration and orchestration, not the story algorithms themselves.
- TaskGraph has stronger guardrails (requires/provides validation) and matches the M4 invariant "reset story globals outside story steps".

### 5.2 End-State Story Globals Migration (Phase 7)

This is the "last thing we do" in this initiative:

- Remove global overlay registry fallback / dependency satisfaction based on global registry size
- Migrate global StoryTags and related caches to a context-owned representation (artifact or explicit `ctx.story.*`)

This depends on resolving the open questions in Section 9.2.
