---
id: CHECKPOINT-M4-2025-12-19
milestone: M4-tests-validation-cleanup
title: "Scope Checkpoint — M4 Tests, Validation & Cleanup"
status: draft
date: 2025-12-19
---

# Scope Checkpoint — M4 Tests, Validation & Cleanup

## Verdict

Recalibration needed.

## Summary

M4 is defined as “Tests, Validation & Cleanup” in `docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md`, but the actual codebase already contains M3/M4-class changes (TaskGraph-only execution, artifact gating, foundation validation, modularization) while multiple docs still describe that work as planned or missing. This creates a real mismatch between the project’s stated scope and the current implementation state, which blocks confident sequencing. No tests were run as part of this checkpoint.

## Target Architecture Gap Analysis

**Checkpoint question:** What gaps remain between the target architecture and the current implementation?

### Gaps (Target vs Current)

- **Recipe-driven pipeline:** Target expects a JSON recipe with per-step config and ordering (`docs/system/libs/mapgen/architecture.md`), but current execution is fixed to `STAGE_ORDER` + `stageManifest` with no per-step config input (`packages/mapgen-core/src/bootstrap/resolved.ts`, `packages/mapgen-core/src/pipeline/StepRegistry.ts`).
- **Dependency-driven scheduling:** Target implies dependency-based ordering within phases; current `PipelineExecutor` executes the static recipe without topological sorting (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`).
- **Registry extensibility:** Target treats `StepRegistry` as a plugin system; current dependency tags are hard-whitelisted to M3 tags, blocking new artifact tags (e.g., `artifact:mesh`) and mod-provided tags (`packages/mapgen-core/src/pipeline/tags.ts`).
- **Artifacts model:** Target uses structured artifacts (`context.artifacts.mesh|crust|plateGraph|tectonics`), while current artifacts are a string-keyed `Map` with only `heightfield`, `climateField`, and `riverAdjacency` plus a separate `foundation` field (`packages/mapgen-core/src/core/types.ts`, `packages/mapgen-core/src/pipeline/artifacts.ts`).
- **Side-effect isolation:** Target wants steps to publish to context then commit at boundaries; current `writeHeightfield`/`writeClimateField` mirrors directly to engine surfaces and `syncHeightfield` reads back from engine (`packages/mapgen-core/src/core/types.ts`).
- **Adapter boundary & globals:** Target forbids global state; current code still relies on engine globals (`GameInfo`, `PlotTags`, `LandmassRegion`, `GameplayMap`, `RandomImpl`, `VoronoiUtils`) in multiple paths (`packages/mapgen-core/src/core/terrain-constants.ts`, `packages/mapgen-core/src/core/plot-tags.ts`, `packages/mapgen-core/src/domain/narrative/utils/*`, `packages/mapgen-core/src/world/*`).
- **Foundation sub-pipeline:** Target foundation uses mesh → crust → partition → physics with explicit artifacts and `d3-delaunay`; current foundation is a single step producing plate/dynamics tensors only, with global Voronoi fallback (`docs/system/libs/mapgen/foundation.md`, `packages/mapgen-core/src/pipeline/foundation/producer.ts`, `packages/mapgen-core/src/world/plates.ts`).
- **Morphology pipeline:** Target morphology is a geomorphic erosion sub-pipeline; current morphology steps are wrap-first legacy terrain layers via adapter (`docs/system/libs/mapgen/morphology.md`, `packages/mapgen-core/src/pipeline/morphology/*`, `packages/mapgen-core/src/domain/morphology/*`).
- **Hydrology/climate products:** Target calls for `ClimateField` as canonical and richer river/lake artifacts; current climate uses published rainfall buffers but still runs engine river modeling and keeps humidity as a placeholder buffer (`docs/system/libs/mapgen/hydrology.md`, `packages/mapgen-core/src/pipeline/hydrology/*.ts`, `packages/mapgen-core/src/domain/hydrology/climate/runtime.ts`).
- **Ecology products:** Target expects pedology/resources artifacts and explicit product usage; current ecology still relies on engine base behavior with light nudges from climate/story tags (`docs/system/libs/mapgen/ecology.md`, `packages/mapgen-core/src/domain/ecology/*`).
- **Narrative overlays:** Target expects a rich `story` artifact (regions/tags/corridors/history); current story uses StoryTags + overlays in a `Map` and still uses engine-global fallbacks in utilities (`docs/system/libs/mapgen/narrative.md`, `packages/mapgen-core/src/domain/narrative/*`).
- **Stage topology mismatch:** Target topology in project docs includes `terrainAdjust`, `rainfallBaseline`, `humidity`, `finalize`, but current `STAGE_ORDER` does not (`docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`, `packages/mapgen-core/src/bootstrap/resolved.ts`).
- **Validation scope:** Target “fail fast” implies full dependency validation; current runtime checks only verify a subset of tags and trusts `state:engine.*` (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`, `packages/mapgen-core/src/pipeline/tags.ts`).

### Ambiguities / Open Questions from Target Specs

- **Recipe + config merge:** How should per-step recipe config integrate with `MapGenConfig` and its schema, and where does validation live? (`docs/system/libs/mapgen/architecture.md`)
- **Artifact storage model:** Are artifacts a structured object (`context.artifacts.mesh`) or a tag-keyed map, and how do tags map to shape validation? (`docs/system/libs/mapgen/architecture.md`, `docs/system/libs/mapgen/foundation.md`)
- **Adapter responsibility for globals:** The target forbids global state but does not spell out where engine-provided globals should be mediated (adapter surface expansion vs. shim layers). (`docs/system/libs/mapgen/architecture.md`)
- **Humidity contract:** `ClimateField.humidity` is listed as placeholder without a defined source or consumer contract. (`docs/system/libs/mapgen/hydrology.md`)
- **Story overlay budget:** ADR-001 calls for an overlay byte budget but leaves the threshold undefined. (`docs/system/libs/mapgen/adrs/adr-001-era-tagged-morphology.md`)
- **WorldModel status:** Architecture bans `WorldModel`, but ADR-001 treats it as a constraint; clarify whether it remains a transitional dependency or is to be fully excised. (`docs/system/libs/mapgen/architecture.md`, `docs/system/libs/mapgen/adrs/adr-001-era-tagged-morphology.md`)
- **Missing design doc:** `packages/mapgen-core/src/AGENTS.md` references `docs/system/libs/mapgen/design.md`, which does not exist. Clarify the canonical spec location. (`packages/mapgen-core/src/AGENTS.md`)

## Drift Analysis

### Scope Drift

- **What:** Phase A foundation cutover and related M4 work appear complete in code, but issues are still marked planned with “done” checkboxes or missing milestone linkage (e.g., `docs/projects/engine-refactor-v1/issues/CIV-48-worldmodel-cut-phase-a.md`, `docs/projects/engine-refactor-v1/issues/CIV-49-contract-enforcement.md`, `docs/projects/engine-refactor-v1/issues/CIV-50-rng-standardization.md`). M4’s issue map still references archived CIV-24 (`docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md`).
- **Impact:** M4 scope is no longer a reliable list of remaining work; planning decisions risk redoing already-landed work or missing actual gaps.
- **Options:**
  - Re-baseline M4 by moving already-landed Phase A work into “completed” and updating issue states.
  - Split a new “M4.1 cleanup” milestone if the intent is to keep M4 as originally planned.

### Architectural Drift

- **What:** Status docs state missing runtime validation and climate canonicalization (`docs/projects/engine-refactor-v1/status.md`), but runtime requires/provides gating and artifact validation exist (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`, `packages/mapgen-core/src/core/types.ts`), and consumers read canonical artifacts (`packages/mapgen-core/src/domain/ecology/biomes/index.ts`, `packages/mapgen-core/src/domain/ecology/features/index.ts`).
- **Impact:** Planned work may be based on stale assumptions; “validation” and “canonical data products” are already partially in place.
- **Options:**
  - Update status to reflect actual runtime gating and artifact use, and explicitly call out the remaining gaps (e.g., `state:engine.*` trust model).
  - Treat current runtime validation as “baseline,” and narrow M4 validation to specific remaining enforcement gaps.

### Sequencing Drift

- **What:** M3 is still “Planned” in docs (`docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`), but TaskGraph is the only execution path (`packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/orchestrator/task-graph.ts`), and the step pipeline is wired (`packages/mapgen-core/src/pipeline/standard.ts`).
- **Impact:** “What’s next” is unclear because the documented sequence does not match the actual state.
- **Options:**
  - Reclassify M3 as “in progress / mostly done” with a delta list.
  - Explicitly define which M3 leftovers (if any) are rolling into M4 cleanup.

### Decision Debt

- **What:** Docs show planned state while acceptance checklists are marked complete in some M4 issues (e.g., `docs/projects/engine-refactor-v1/issues/CIV-49-contract-enforcement.md`).
- **Impact:** The decision trail is ambiguous, and it’s hard to defend what is “done” vs “pending.”
- **Options:**
  - Align issue states with actual code, or add a short “landed in <commit/PR>” note to close the loop.

## Upcoming Work Assessment (M4)

- **CIV-23** needs re-scope because its WorldModel lifecycle tests likely no longer align with current architecture (`docs/projects/engine-refactor-v1/issues/CIV-23-integration-tests.md`, `packages/mapgen-core/src/MapOrchestrator.ts`).
- **CIV-24** is referenced in the M4 milestone doc but only exists in archive (`docs/projects/engine-refactor-v1/issues/_archive/CIV-24-dev-diagnostics.md`), so the M4 issue map is invalid.
- **CIV-9** remains optional tooling and not an architectural blocker (`docs/projects/engine-refactor-v1/issues/CIV-9-bun-pnpm-bridge.md`).
- **Remaining M4 gap candidates** appear to be cleanup and enforcement around fallbacks (e.g., GameplayMap/Voronoi fallbacks) and fuller regression tests; these are not captured in the current milestone doc.

## Documentation Gaps

- Status doc is out of sync with runtime gating and artifact usage (`docs/projects/engine-refactor-v1/status.md`).
- Deferrals on legacy TaskGraph path and global StoryTags/Overlays are likely stale (`docs/projects/engine-refactor-v1/deferrals.md`, `packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/domain/narrative/tags/ops.ts`, `packages/mapgen-core/src/domain/narrative/overlays/registry.ts`).
- M4 milestone doc still points to archived or completed items without a current issue map (`docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md`).

## Inventory Snapshot

### Overview

- `docs/projects/engine-refactor-v1/` contains 104 files (milestones, reviews, issues, resources, status/triage/deferrals, checkpoints).
- Project spikes: 11 under `docs/projects/engine-refactor-v1/resources/`.
- System mapgen research spikes: 4 under `docs/system/libs/mapgen/research/`.

### Spike Cleanup Recommendations (Project)

- Keep active (implementation-adjacent): `docs/projects/engine-refactor-v1/resources/SPIKE-orchestrator-bloat-assessment.md`, `docs/projects/engine-refactor-v1/resources/SPIKE-story-drift-legacy-path-removal.md`, `docs/projects/engine-refactor-v1/resources/SPIKE-story-config-typing.md`.
- Move to system/process tooling (not project scope): `docs/projects/engine-refactor-v1/resources/SPIKE-bun-migration-feasibility.md`, `docs/projects/engine-refactor-v1/resources/SPIKE-ruler-global-and-repo-rules.md`.
- Fold into system mapgen docs or research (then archive): `docs/projects/engine-refactor-v1/resources/SPIKE-pipeline-foundation-stage-design-physics.md`, `docs/projects/engine-refactor-v1/resources/SPIKE-pipeline-foundation-stage-architecture-review.md`.
- Archive as historical snapshot: `docs/projects/engine-refactor-v1/resources/SPIKE-mapgen-docs-inventory-pre-refactor.md`.
- Empty placeholder: `docs/projects/engine-refactor-v1/resources/SPIKE-pipeline-foundation-stage-architecture-review-alt.md` (delete or replace; needs your call).

### Non-Spike Project Doc Cleanup Candidates

- Consider archiving M1 parity trackers if M1 is truly complete: `docs/projects/engine-refactor-v1/resources/STATUS-M-TS-parity-matrix.md`, `docs/projects/engine-refactor-v1/resources/STATUS-M-TS-typescript-migration-parity-notes.md`.
- Normalize slide location: `docs/slides/m3-core-engine-refactor-config-evolution.json` and `docs/slides/m3-core-engine-refactor-config-evolution.outline.md` should move into `docs/projects/engine-refactor-v1/resources/slides/` or be archived.
- Promote when stable: `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` should likely move into `docs/system/libs/mapgen/` once the contract stops changing.

### System Mapgen Research Spikes (Possible Consolidation)

- Keep only the synthesis doc as the canonical research summary, archive the rest if you want to reduce drift: `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md` plus the three other research spikes.

### Ambiguities / Decisions Needed

- Is Bun migration in scope for this project, or should it be moved/archived? (`docs/projects/engine-refactor-v1/resources/SPIKE-bun-migration-feasibility.md`).
- Should the terrain/feature verification doc live with the mod (likely) or stay as a project resource? (`docs/projects/engine-refactor-v1/resources/SPIKE-mapgen-terrain-feature-verification.md`).
- Do you want to keep multiple foundation-stage spikes, or consolidate into `docs/system/libs/mapgen/foundation.md` + `docs/system/libs/mapgen/architecture.md` and archive the rest?

## Decision Tree / Sequence

1. **Canonical Target Architecture Source**
   - Decisions: Where is the authoritative spec? Resolve the missing `docs/system/libs/mapgen/design.md` vs `architecture.md` vs other sources; pick the canonical doc(s).
   - Unblocks: Every later clarification and doc consolidation (prevents rework/duplication).
2. **Core Architecture Clarifications (data + boundaries)**
   - Decisions:
     - Artifact storage model (structured object vs tag-keyed map + validation).
     - Adapter responsibilities for engine globals (what is allowed at the boundary).
     - WorldModel status (fully excise vs transitional).
   - Unblocks: Recipe/config model, validation rules, and what should be treated as “legacy cleanup” in M4.
3. **Pipeline & Validation Clarifications**
   - Decisions:
     - Recipe/config merge model (per-step config + schema + validation location).
     - Dependency-driven scheduling expectations vs static ordering.
     - Validation scope for `state:engine.*` and artifact contracts.
   - Unblocks: M4 scope definition (tests vs enforcement), and cleanup targets.
4. **Domain Contract Clarifications**
   - Decisions:
     - Humidity contract (source/consumer expectations).
     - Story overlay budget threshold (from ADR).
   - Unblocks: Whether to add/adjust work items in M4 (tests, enforcement, or deferrals).
5. **Milestone Re-baseline (M4 scope & sequencing)**
   - Decisions:
     - What remains for M4 after clarifications?
     - Which issues are obsolete/complete/need re-scoping?
     - Are any “cleanup” items actually architectural work that needs explicit scope?
   - Unblocks: Precise doc cleanup actions and what to archive vs keep active.
6. **Doc Cleanup — Architecture-Dependent Items**
   - Decisions:
     - Foundation-stage spikes consolidation into system docs vs keep multiple spikes.
     - Promote `CONTRACT-foundation-context.md` once stable.
     - Consolidate system mapgen research spikes into synthesis (if architecture is settled).
   - Unblocks: Archiving plan for spikes and research docs.
7. **Doc Cleanup — Scope/Boundary Items**
   - Decisions:
     - Bun migration in/out of project scope.
     - Terrain/feature verification doc location (project vs mod).
   - Unblocks: Move/archiving of those spikes and related TODOs.
8. **Doc Cleanup — Low-dependency Housekeeping**
   - Decisions:
     - Archive M1 parity trackers if truly complete.
     - Normalize slide locations or archive.
     - Delete/replace empty placeholder spike file.
   - Unblocks: Final doc hygiene pass.

## Decision Log

### Decision Frame 1: Canonical Target Architecture Source

- **Decision:** Treat the in-progress target architecture draft (maintained outside this thread) as the working canonical source for checkpoint analysis and planning. Treat `docs/system/libs/mapgen/architecture.md` as legacy to be replaced or merged into the draft once it stabilizes. Treat project-local drafts as staging/feeder docs, not authoritative.
- **Assumptions:** The draft will be promoted into system docs once it is sufficiently stable; `architecture.md` will be superseded rather than co-exist as a competing authority.
- **Risks / Provisional Notes:** This is provisional and may change as the draft resolves open questions. Any downstream decisions that require finalized spec details should be flagged as risk or blocked until the draft stabilizes.

### Decision Frame 2: Core Architecture Clarifications (partial)

- **Artifact storage model:** Pending review of options and trade-offs; decision to be recorded after Frame 2 analysis.
- **Adapter boundary (engine globals):**
  - **Decision:** Single adapter boundary is mandatory; no engine globals may be accessed outside the adapter surface, and no transitional global fallbacks are permitted.
  - **Assumptions:** The adapter will expose the required engine capabilities (e.g., terrain/feature/biome lookups, plot tags/landmass region IDs, RNG, Voronoi utilities, gameplay map queries).
  - **Risks / Provisional Notes:** Current code still reads engine globals in multiple modules (e.g., `core/terrain-constants.ts`, `core/plot-tags.ts`, `world/plate-seed.ts`, `world/plates.ts`, `domain/narrative/utils/*`). M4 scope must include enforcing the adapter boundary and removing these direct global reads.
- **WorldModel status:**
  - **Decision:** WorldModel is fully excised. Any remaining references in code, tests, or docs are defects to be removed; foundation artifacts are the sole source of truth.
  - **Assumptions:** Foundation outputs can fully replace any remaining WorldModel-derived reads.
  - **Risks / Provisional Notes:** WorldModel still exists as a module and is referenced in docs/tests; cleanup will require updating or removing those references and aligning deferrals/PRDs.

## Recommended Actions

### Immediate

- Re-baseline M3/M4 state: mark what is actually done, remove or re-map archived items, and re-scope M4 to only remaining hardening/cleanup.
- Update `docs/projects/engine-refactor-v1/status.md` to reflect current runtime gating and artifact usage.

### Soon

- Re-scope CIV-23 to target artifact/step contracts instead of WorldModel lifecycle.
- Decide the desired M4 scope for fallback removal (e.g., Voronoi and GameplayMap fallbacks) and add concrete issues if needed.

### Backlog

- Decide and document the validation strategy for `state:engine.*` dependency tags (currently trusted) as noted in `docs/projects/engine-refactor-v1/triage.md`.

## Evidence (Artifacts Reviewed)

- Milestones: `docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`, `docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md`
- Status / deferrals / triage: `docs/projects/engine-refactor-v1/status.md`, `docs/projects/engine-refactor-v1/deferrals.md`, `docs/projects/engine-refactor-v1/triage.md`
- M4 issue docs: `docs/projects/engine-refactor-v1/issues/CIV-23-integration-tests.md`, `docs/projects/engine-refactor-v1/issues/CIV-48-worldmodel-cut-phase-a.md`, `docs/projects/engine-refactor-v1/issues/CIV-49-contract-enforcement.md`, `docs/projects/engine-refactor-v1/issues/CIV-50-rng-standardization.md`, `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`, `docs/projects/engine-refactor-v1/issues/CIV-9-bun-pnpm-bridge.md`
- Reviews: `docs/projects/engine-refactor-v1/reviews/REVIEW-M3-core-engine-refactor-config-evolution.md`, `docs/projects/engine-refactor-v1/reviews/REVIEW-M4-tests-validation-cleanup.md`, `docs/projects/engine-refactor-v1/reviews/REVIEW-CIV-M4-ADHOC-modularize.md`
- Code: `packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/orchestrator/task-graph.ts`, `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`, `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/core/types.ts`, `packages/mapgen-core/src/domain/ecology/biomes/index.ts`, `packages/mapgen-core/src/domain/ecology/features/index.ts`, `packages/mapgen-core/src/domain/narrative/tags/ops.ts`, `packages/mapgen-core/src/domain/narrative/overlays/registry.ts`
