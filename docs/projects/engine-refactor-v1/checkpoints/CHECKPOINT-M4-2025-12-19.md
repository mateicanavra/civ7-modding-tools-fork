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
