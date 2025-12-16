# SPIKE: Story Drift + Legacy Path Removal (MapGen Core)

## Objective

Investigate the current “story drift” risk in `@swooper/mapgen-core`, and determine whether it’s feasible (and safe) to fully remove legacy orchestration **and** legacy compatibility surfaces (config toggles, shims/re-exports) in favor of the newer hybrid/pipeline (“TaskGraph”) architecture, given that we currently control all consumers.

## Context (what “legacy” means here)

- **Legacy orchestrator path**: `MapOrchestrator.generateMap()`’s inline stage runner (including inline story stages), selected when `OrchestratorConfig.useTaskGraph !== true` (`packages/mapgen-core/src/MapOrchestrator.ts`, `generateMap()`).
- **TaskGraph path**: `PipelineExecutor + StepRegistry` execution from `MapOrchestrator.generateMapTaskGraph()` (`packages/mapgen-core/src/MapOrchestrator.ts`, `generateMapTaskGraph()`), used when `useTaskGraph: true`.
- **Legacy compatibility surfaces** (separate from orchestration):
  - Legacy story enablement toggles (`config.toggles.STORY_ENABLE_*`) that mirror old JS-era switches (`packages/mapgen-core/src/config/schema.ts`, `TogglesSchema`).
  - Legacy step/shim exports (`packages/mapgen-core/src/steps/*`, `createLegacy*Step`) and a legacy placement step type (`packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts`).
  - Legacy bootstrap input shapes (e.g., `bootstrap()`’s `BootstrapConfig.stages` “legacy interface” in `packages/mapgen-core/src/bootstrap/entry.ts`).

## Assumptions and unknowns

### Assumptions

- There are no external, uncontrolled consumers relying on legacy stage order/behavior; the only risk is internal breakage.
- “Target architecture” is the M3+ pipeline model: domain algorithms in `domain/**`, wiring in `pipeline/**`, and story/playability steps remaining optional and ultimately extractable (matches `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`).

### Unknowns (that affect feasibility and rollout risk)

- Whether any out-of-repo consumers already rely on `OrchestratorConfig.useTaskGraph`, legacy `generateMap()` semantics, or the `config.toggles.STORY_ENABLE_*` surface (none found in-repo beyond tests/mods/docs, but this can’t be proven from a workspace scan).
- Whether we still need an independent, non-legacy equivalent of “paleo enabled” separate from stage gating (see “Open decisions”).

## Summary verdict

**Feasible, and high-leverage to do now.** With story logic now modularized and shared across the pipeline steps + domain modules, the dominant drift vector is keeping multiple orchestration paths and legacy compatibility surfaces alive. Given that we control consumers, it’s practical to remove the legacy orchestrator path and the legacy story toggle surface in the same stack, while explicitly deferring only true behavior-mode selectors (e.g. `"legacy" | "area"` algorithm modes).

## Evidence (current state)

### 1) Two orchestration paths exist today (drift is structurally inevitable)

- Branching entrypoint: `packages/mapgen-core/src/MapOrchestrator.ts` (`generateMap()` checks `options.useTaskGraph`).
- Legacy inline story stages live in the legacy runner:
  - `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridorsPre` (`packages/mapgen-core/src/MapOrchestrator.ts:553-636`)
  - `storySwatches` + paleo-in-rivers + `storyCorridorsPost` (`packages/mapgen-core/src/MapOrchestrator.ts:741-823`)
- Equivalent pipeline story steps exist:
  - `packages/mapgen-core/src/pipeline/narrative/*`
  - Example parity: `StorySeedStep` resets story state and runs `storyTagContinentalMargins`, matching the legacy stage body (`packages/mapgen-core/src/pipeline/narrative/StorySeedStep.ts:20-46`).

### 2) Story modularization increases the cost of keeping legacy orchestration

The modularization work reduced “two story implementations” drift, but it increased the architectural drift cost of keeping two orchestrators alive:

- The M4 design locks the invariant: **reset story globals once per generation at the orchestrator boundary**, not inside story stages that can be disabled (`docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`, “Story/Playability Steps”).
- TaskGraph implements that invariant: `generateMapTaskGraph()` resets story globals once per run before executing the recipe (`packages/mapgen-core/src/MapOrchestrator.ts`, `generateMapTaskGraph()`).
- Legacy path still resets primarily inside the `storySeed` stage (and other story stages), so disabling `storySeed` can re-introduce cross-run leakage and violate the intended “story is optional” contract (`packages/mapgen-core/src/MapOrchestrator.ts`, legacy inline runner).

### 3) Internal consumers (in-repo) and what actually needs migration

Workspace scan suggests there are only three meaningful categories of “internal consumers” to migrate off legacy:

- **Mods (TypeScript sources):**
  - TaskGraph enabled: `mods/mod-swooper-maps/src/swooper-earthlike.ts` (`useTaskGraph: true`).
  - Legacy path: `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` (no `useTaskGraph`).
- **Tests:** multiple orchestrator tests call `generateMap()` without `useTaskGraph`, so they currently exercise legacy by default (e.g. `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts`).
- **Docs/examples:** a few docs still imply legacy control surfaces / patterns (e.g. `docs/system/mods/swooper-maps/architecture.md`).

Note: built artifacts under `mods/mod-swooper-maps/mod/maps/*.js` also contain legacy strings, but these are generated outputs and are not treated as meaningful “consumers” (they can be regenerated after source updates).

### 4) Pipeline ordering + stage enablement is already canonicalized (strong foundation)

- Canonical stage order is centralized in `STAGE_ORDER` (`packages/mapgen-core/src/bootstrap/resolved.ts`).
- `bootstrap()` resolves `stageConfig -> stageManifest`, so stage enablement has a canonical representation by default (`packages/mapgen-core/src/bootstrap/entry.ts`).
- TaskGraph executes `StageManifest.order` filtered by enablement (`packages/mapgen-core/src/pipeline/StepRegistry.ts`).
- TaskGraph adds guardrails via requires/provides validation (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`).

### 5) Story enablement is still represented twice (stages + legacy toggles)

We have a canonical “what stages are enabled” representation (the resolved `stageManifest`), but legacy toggles still exist as an authored config surface and are consumed in domain logic.

- Stage gating is derived from `stageManifest` (`packages/mapgen-core/src/MapOrchestrator.ts`, `resolveStageFlags()`).
- `MapOrchestrator` derives and overwrites story-related toggles when constructing `context.config` (`packages/mapgen-core/src/MapOrchestrator.ts`, `buildContextConfig()`).
- Downstream logic still reads `config.toggles.STORY_ENABLE_*` directly:
  - Features: `packages/mapgen-core/src/domain/ecology/features/index.ts` gates some effects via `STORY_ENABLE_HOTSPOTS` even though it also checks story tag sets.
  - Biomes: `packages/mapgen-core/src/domain/ecology/biomes/index.ts` gates rift shoulder bias via `STORY_ENABLE_RIFTS`.
  - Climate refine: `packages/mapgen-core/src/domain/hydrology/climate/refine/orogeny-belts.ts` gates refinement via `STORY_ENABLE_OROGENY`.
  - Paleo is gated in the rivers step via a toggle (`packages/mapgen-core/src/pipeline/hydrology/index.ts`).
- Presets set story toggles but do not enable story stages by default, which is a confusing contract if `stageManifest` is intended to be authoritative (`packages/mapgen-core/src/config/presets.ts`).

Also: `StageDescriptorSchema` includes `legacyToggles` metadata (`packages/mapgen-core/src/config/schema.ts`) but there are no in-repo reads of that field today. That “half-bridge” is drift bait: it suggests canonical mapping exists, but it currently doesn’t.

### 6) Other legacy compatibility surfaces that are removable now

- `packages/mapgen-core/src/steps/index.ts` re-exports `createLegacyBiomesStep`, `createLegacyFeaturesStep`, `createLegacyPlacementStep` (thin aliases over pipeline steps).
- `packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts` exists and is exercised by tests (`packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`), even though the standard pipeline uses `createPlacementStep` (`packages/mapgen-core/src/pipeline/placement/index.ts`).
- `bootstrap()` still types a legacy `BootstrapConfig.stages` object (commented as “legacy interface”) in `packages/mapgen-core/src/bootstrap/entry.ts`; no in-repo callsites were found using this surface.

## Primary recommendation

### Remove legacy orchestration and legacy compat surfaces now (keep only behavior modes)

Why:

- Keeping multiple orchestrators guarantees drift: any change to stage order, resets, artifacts, or “story optionality” must be implemented twice.
- With story now modularized and shared across pipeline wiring + domain components, the dominant remaining drift is configuration and orchestration, not the story algorithms themselves.
- TaskGraph has stronger guardrails (requires/provides validation) and matches the M4 invariant “reset story globals outside story steps”.

Scope note:

- This recommendation intentionally **does not** remove true behavioral modes (e.g., algorithm mode selectors like `"legacy" | "area"`), because those are not compatibility shims—they’re behavior contracts. See “Explicit deferrals”.

## What “done” looks like (conceptual shape)

End-state vision:

- **Single orchestrator path**: `MapOrchestrator.generateMap()` is TaskGraph-only; no inline legacy stage runner exists; `OrchestratorConfig.useTaskGraph` does not exist.
- **Single enablement surface**: stage enablement is expressed only via `stageConfig/stageManifest` (resolved by `bootstrap()`), not via legacy story toggle mirrors.
- **Story optionality is structural**:
  - Disabling story stages never re-introduces state leakage (globals reset per run at the orchestrator boundary).
  - Downstream steps that “benefit from story” use the presence/absence of story artifacts/tags as their primary signal, not an independent legacy toggle surface.
- **No legacy shims in the public API**: remove `createLegacy*Step` aliases and legacy bootstrap config shapes that only exist for historical callers.

## What we plan to delete (non-exhaustive)

- **Orchestration switch + duplicate runner**
  - `OrchestratorConfig.useTaskGraph` and the `generateMap()` branch that selects between two orchestrators (`packages/mapgen-core/src/MapOrchestrator.ts`).
  - The legacy inline stage runner blocks inside `generateMap()` (including inline story stages).
- **Legacy story toggle surface**
  - `config.toggles.STORY_ENABLE_*` from config schema (`packages/mapgen-core/src/config/schema.ts`) and presets (`packages/mapgen-core/src/config/presets.ts`).
  - The toggle-derivation bridge in `MapOrchestrator.buildContextConfig()` (`packages/mapgen-core/src/MapOrchestrator.ts`).
  - Downstream toggle-based gating in non-story code paths (e.g. ecology/biomes/climate refine), migrating those decisions to stage enablement and/or artifact/tag presence.
- **Dead / half-migrated metadata**
  - `StageDescriptorSchema.legacyToggles` (present in schema; no in-repo reads found).
- **Legacy shims / re-export surfaces**
  - `packages/mapgen-core/src/steps/*` legacy step aliases and any remaining references to `createLegacy*Step`.
  - `packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts` (after tests migrate off it).
- **Legacy bootstrap input shapes**
  - `BootstrapConfig.stages` legacy interface in `packages/mapgen-core/src/bootstrap/entry.ts` (no in-repo callsites found using it).

## High-level implementation outline (sequenced, thin-slice)

1) Migrate all in-repo callsites and tests to a single orchestration path (TaskGraph-only).
2) Make `generateMap()` TaskGraph-only; remove `OrchestratorConfig.useTaskGraph`; delete the legacy inline stage runner blocks.
3) Remove legacy story toggle surface (`config.toggles.STORY_ENABLE_*`) and migrate gating to canonical signals:
   - stage enablement (`stageManifest`) and/or
   - artifact/tag presence (story overlays/tags), depending on the subsystem.
4) Remove other legacy shims:
   - `createLegacy*Step` exports and `LegacyPlacementStep` (after migrating the tests that rely on them),
   - unused schema metadata like `StageDescriptorSchema.legacyToggles` (or finish the mapping and then immediately remove it once all callers are migrated—prefer removal).
5) Align presets and docs with the new contract (presets should not set legacy story toggles; docs should not describe legacy control surfaces).
6) Validation strategy:
   - Keep a small set of orchestrator smoke tests that assert intended optional-story behavior (story tags when enabled; no story effects when disabled; paleo ordering).

## Risks, trade-offs, regressions

- **Internal breakage** is expected: any internal mod/config relying on legacy behavior must be migrated in lockstep.
- **Config semantic ambiguity** is the biggest footgun: presets and runtime toggle-derivation currently send mixed signals.
- **Paleo gating is the main nuance**: it’s currently controlled by both stage enablement and a legacy toggle; removing legacy toggles forces a decision about the replacement signal.
- **Hidden consumers** are the only meaningful external risk; if the repo is not yet published for modders, this is likely low.

## Explicit deferrals (behavior modes we should not remove in this stack)

Intent: remove legacy *compatibility* surfaces, but do not rename/remove “legacy” *behavior modes* that are part of algorithm semantics today.

Examples to defer (non-exhaustive):

- Algorithm mode selectors like `"legacy" | "area"` (e.g. landmask/crust behavior in `packages/mapgen-core/src/config/schema.ts` and `packages/mapgen-core/src/domain/morphology/landmass/crust-mode.ts`).

Trigger to revisit:

- Once we have confidence that internal consumers no longer need to compare/validate “legacy vs area” behavior (e.g., parity matrices stabilized or the team decides one mode is canonical and deletes the other).

Other legacy surfaces noticed (not behavior modes):

- Deprecated top-level diagnostics toggles are still present in config schema as “[legacy/no-op]” (`packages/mapgen-core/src/config/schema.ts`, `DiagnosticsConfigSchema`). If the goal is “no legacy config surface at all”, these can likely be removed in the same initiative, but they are not directly tied to story drift.

## Open decisions

1) Should `generateMap()` remain the stable entrypoint (TaskGraph-only), or should we require an explicit “pipeline” entrypoint to make the breaking change obvious?
2) For paleo specifically: do we still need an independent “paleo enabled” switch, or is “paleo config present + storySwatches enabled” the canonical gate?
   - If an independent switch is still needed, prefer a non-legacy config surface (e.g. `climate.story.paleo.enabled`) rather than retaining `STORY_ENABLE_PALEO`.
