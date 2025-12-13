---
id: LOCAL-M2-DOCS-ALIGNMENT
title: "[M2] Align docs and status with config + foundation slice implementation"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Documentation, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-26, CIV-27, CIV-28, CIV-29, CIV-30, CIV-31]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Update M2 project docs and related issue files so they accurately describe the real engine flow (`bootstrap() → MapGenConfig → tunables → MapOrchestrator → FoundationContext`) and reflect that generic pipeline primitives (`PipelineExecutor` / `MapGenStep` / `StepRegistry`) are planned for M3+, not already implemented in M2.

## Deliverables

- M2 milestone doc and project brief describe M2 as:
  - “Config + foundation slice is stable, documented, and test-backed” on the current `MapOrchestrator`-centric architecture.
  - Explicitly not delivering a generic `PipelineExecutor` / `MapGenStep` / `StepRegistry` yet.
- References to `globalThis.__EPIC_MAP_CONFIG__` and the legacy global-config pattern are removed or clearly marked as historical/future, not current behavior.
- Language that assumes an already-implemented generic pipeline executor in M2 is softened or moved under M3+ scope.
- The engine-refactor status snapshot reflects config + foundation slice as complete and positions pipeline primitives + data-product evolution as upcoming M3 work.

## Acceptance Criteria

- [ ] `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md` summary/scope/objectives describe the orchestrator-centric M2 slice and do not promise a fully generic `PipelineExecutor` in this milestone.
- [ ] `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md` describes M2 as “config + foundation slice, documented, test-backed” and defers the task-graph primitives to M3.
- [ ] `docs/projects/engine-refactor-v1/status.md` marks the config + foundation slice as done and lists pipeline primitives + ClimateField/StoryOverlays evolution under “Ready Next” / M3.
- [ ] Any remaining references to `globalThis.__EPIC_MAP_CONFIG__` in project docs or engine-refactor issues are removed or clearly marked as historical/future.

## Testing / Verification

- Read through the updated M2 milestone, project brief, and status snapshot to ensure:
  - They all agree on the M2 definition and on where pipeline primitives land.
  - There is no lingering implication that `PipelineExecutor` / `MapGenStep` / `StepRegistry` are already wired in M2.
- Optionally, cross-check against the M2 review doc to confirm wording is consistent.

## Dependencies / Notes

- This is a documentation-only follow-up to CIV-26–CIV-31; it should not change runtime behavior.
- System docs (`docs/system/libs/mapgen/*.md`) remain canonical and describe the **target** architecture; they may include a brief heads-up that some pieces are not wired yet, but should not carry temporal status.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Focus on project-level docs under `docs/projects/engine-refactor-v1/` plus the engine-refactor status snapshot.
- Avoid over-describing current limitations in the system architecture docs; keep them focused on target shape with a light heads-up where needed.

