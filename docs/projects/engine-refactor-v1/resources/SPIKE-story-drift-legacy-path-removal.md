# SPIKE: Story Drift + Legacy Path Removal (MapGen Core)

## Objective

Investigate the current “story drift” risk in `@swooper/mapgen-core`, and determine whether it’s feasible (and safe) to fully remove the legacy orchestration path in favor of the newer hybrid/pipeline (“TaskGraph”) path, given that we currently control all consumers.

## Context (what “legacy” means here)

- **Legacy path**: `MapOrchestrator.generateMap()`’s inline stage runner (including inline story stages), selected when `OrchestratorConfig.useTaskGraph !== true` (`packages/mapgen-core/src/MapOrchestrator.ts:329-332`).
- **TaskGraph path**: `PipelineExecutor + StepRegistry` execution from `MapOrchestrator.generateMapTaskGraph()` (`packages/mapgen-core/src/MapOrchestrator.ts:939`), used when `useTaskGraph: true`.

## Assumptions and unknowns

### Assumptions

- There are no external, uncontrolled consumers relying on legacy stage order/behavior; the only risk is internal breakage.
- “Target architecture” is the M3+ pipeline model: domain algorithms in `domain/**`, wiring in `pipeline/**`, and story/playability steps remaining optional and ultimately extractable (matches `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`).

### Unknowns (that affect feasibility and rollout risk)

- Whether any out-of-repo consumers already rely on `OrchestratorConfig.useTaskGraph` or legacy `generateMap()` semantics.
- Whether `config.stageConfig/stageManifest` should be the sole “enable story” surface, or whether `config.toggles.STORY_ENABLE_*` should remain an authored input.

## Summary verdict

**Feasible with caveats.** The TaskGraph pipeline already includes story steps that mirror the legacy inline story stages, and at least one internal mod already runs via TaskGraph. The main remaining risk is semantic drift from maintaining two orchestration paths and two story enablement representations (stages vs toggles).

## Evidence (current state)

### 1) Two orchestration paths exist today (drift is structurally inevitable)

- Branching entrypoint: `packages/mapgen-core/src/MapOrchestrator.ts:329-332`.
- Legacy inline story stages live in the legacy runner:
  - `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridorsPre` (`packages/mapgen-core/src/MapOrchestrator.ts:553-636`)
  - `storySwatches` + paleo-in-rivers + `storyCorridorsPost` (`packages/mapgen-core/src/MapOrchestrator.ts:741-823`)
- Equivalent pipeline story steps exist:
  - `packages/mapgen-core/src/pipeline/narrative/*`
  - Example parity: `StorySeedStep` resets story state and runs `storyTagContinentalMargins`, matching the legacy stage body (`packages/mapgen-core/src/pipeline/narrative/StorySeedStep.ts:20-46`).

### 2) Internal consumers exercise both paths

- TaskGraph enabled: `mods/mod-swooper-maps/src/swooper-earthlike.ts:352` (`useTaskGraph: true`).
- Legacy path still used: `mods/mod-swooper-maps/src/swooper-desert-mountains.ts:298-330` (no `useTaskGraph`).

### 3) Pipeline ordering is already canonicalized (a good foundation for removing legacy)

- Canonical stage order is centralized in `STAGE_ORDER` (`packages/mapgen-core/src/bootstrap/resolved.ts:28-50`).
- TaskGraph executes `StageManifest.order` filtered by enablement (`packages/mapgen-core/src/pipeline/StepRegistry.ts:32-37`).
- TaskGraph also adds guardrails via requires/provides validation (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts:83-99`).

### 4) Story enablement is currently represented twice (stages + toggles)

- Stage gating is derived from `stageManifest` (`packages/mapgen-core/src/MapOrchestrator.ts:1190-1218`).
- `MapOrchestrator` derives and overwrites story-related toggles when constructing `context.config` (`packages/mapgen-core/src/MapOrchestrator.ts:1163-1179`).
- Some downstream logic reads `config.toggles.STORY_ENABLE_*` directly (e.g., features/biomes) rather than deriving intent from stage enablement and/or overlay presence:
  - `packages/mapgen-core/src/domain/ecology/features/index.ts:92-107`
  - `packages/mapgen-core/src/domain/ecology/biomes/index.ts:179-186`
- Presets set story toggles but do not enable story stages by default, which is a confusing contract if stages are meant to be authoritative (`packages/mapgen-core/src/config/presets.ts:52-88`).

## Primary recommendation

### Make TaskGraph the only orchestrator path; remove legacy inline stage runner entirely

Why:

- Keeping both paths guarantees drift: any change to story order, caches/resets, artifacts, or “story optionality” must be duplicated.
- TaskGraph has stronger correctness guardrails (dependency checks and provides validation) that will catch story-step regressions earlier.

Scope note:

- This recommendation is intentionally limited to removing the **legacy orchestrator path**, not re-architecting story state (globals) or extracting story into plugin packages. Those are follow-on improvements.

## What “done” looks like (conceptual shape)

- `MapOrchestrator.generateMap()` always executes via `PipelineExecutor + StepRegistry` and never runs inline stages.
- `OrchestratorConfig.useTaskGraph` is removed (or becomes a no-op) so there is one supported execution path.
- Story stages remain optional via `stageConfig/stageManifest` gating, but the semantics are clarified so there is a single source of truth:
  - Either treat `stageConfig/stageManifest` as canonical and make story toggles derived-only (or remove presets’ story toggles to avoid misleading config),
  - Or treat toggles as canonical and derive stage enablement from them (less aligned with the current StageManifest design).

## High-level implementation outline (sequenced, thin-slice)

1) Migrate all in-repo callsites to TaskGraph-only behavior (e.g., bring `swooper-desert-mountains` in line with `swooper-earthlike`).
2) Make `generateMap()` TaskGraph-only (keep method name/signature stable).
3) Delete the legacy inline stage runner blocks (including inline story stages).
4) Resolve story enablement semantics:
   - pick one canonical surface (stages vs toggles),
   - remove contradictory defaults (notably presets).
5) Validation strategy:
   - Keep a small set of orchestrator smoke tests that ensure key story behaviors still work in the single remaining path (e.g. paleo ordering; story tags emitted when enabled).

## Risks, trade-offs, regressions

- **Internal breakage** is expected: any internal mod/config relying on legacy behavior must be migrated in lockstep.
- **Config semantic ambiguity** is the biggest footgun: presets and runtime toggle-derivation currently send mixed signals.
- **Hidden consumers** are the only meaningful external risk; if the repo is not yet published for modders, this is likely low.

## Open decisions

1) Should `generateMap()` remain the stable entrypoint (TaskGraph-only), or should we require an explicit “pipeline” entrypoint to make the breaking change obvious?
2) Should `config.toggles.STORY_ENABLE_*` remain an authored input, or become derived-only from `stageConfig/stageManifest`?

