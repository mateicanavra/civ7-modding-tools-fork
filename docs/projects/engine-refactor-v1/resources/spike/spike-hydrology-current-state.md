# Hydrology Domain Refactor — Phase 1 Current-State Spike

This spike is the Phase 1 output for the Hydrology vertical refactor workflow.

References:
- Plan: docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/HYDROLOGY.md
- Workflow: docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md

Goal: ground the Hydrology refactor in current-state reality (wiring, contracts, boundary violations) so Phase 2/3 can be re-scoped based on evidence.

---

## Phase 0 baseline gates (status: pending)

Status: not run.

## Phase 1 hypotheses to validate (from plan)

- Hydrology is split across multiple recipe stages:
  - /src/recipes/standard/stages/hydrology-pre/
  - /src/recipes/standard/stages/hydrology-core/
  - /src/recipes/standard/stages/hydrology-post/
- These stages appear to still use legacy stage/step authoring posture (no stage-owned artifacts.ts, legacy tag-based requires/provides, direct imports of .../artifacts.js).
- /src/domain/hydrology/ops/contracts.ts is currently empty (not contract-first in practice).
- Current steps perform climate and water work directly:
  - lakes, climate-baseline (pre)
  - rivers (core)
  - climate-refine (post)
- Cross-domain coupling to make explicit in the contract matrix:
  - Climate refine consumes env.directionality and narrative motifs (rifts, hotspots) plus river adjacency.

## Domain surface inventory (outside view)

TBD.

## Contract matrix (current-state)

TBD.

## Decisions + defaults (initial)

TBD.

## Risk register (initial)

TBD.

## Golden path candidate

TBD.

## Deletion list

TBD.

## Lookback 1

TBD.
