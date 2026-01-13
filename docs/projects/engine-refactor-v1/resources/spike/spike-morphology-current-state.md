# Morphology Domain Refactor — Phase 1 Current-State Spike

This spike is the Phase 1 output for the Morphology vertical refactor workflow.

References:
- Plan: docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/MORPHOLOGY.md
- Workflow: docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md

Goal: ground the Morphology refactor in current-state reality (wiring, contracts, boundary violations) so Phase 2/3 can be re-scoped based on evidence.

---

## Phase 0 baseline gates (status: pending)

Status: not run.

## Phase 1 hypotheses to validate (from plan)

- Morphology is split across multiple recipe stages:
  - /src/recipes/standard/stages/morphology-pre/
  - /src/recipes/standard/stages/morphology-mid/
  - /src/recipes/standard/stages/morphology-post/
- These stages appear to still use legacy stage/step authoring posture (no stage-owned artifacts.ts, legacy run(ctx, config) signature).
- /src/domain/morphology/ops/contracts.ts is currently empty (not contract-first in practice).

## Domain surface inventory (outside view)

TBD.

## Contract matrix (current-state)

TBD.

## Legacy surface inventory (config properties + rules/policies + functions)

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
