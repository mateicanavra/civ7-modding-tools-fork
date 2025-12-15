---
id: CIV-40
title: "[M3] Clarify MapGen system docs: Target vs Current (post-M2)"
state: planned
priority: 4
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Documentation, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-33, CIV-34]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add an explicit “Target vs Current implementation” framing to the canonical system docs so agents and humans can quickly understand (1) the stable target architecture we’re steering toward, and (2) the pragmatic post‑M2 reality, without rewriting the target design or doing a full current-vs-target reconciliation.

## Deliverables

- Update the system docs:
  - `docs/system/libs/mapgen/architecture.md`
  - `docs/system/libs/mapgen/foundation.md`
  - `docs/system/libs/mapgen/hydrology.md`
- Each doc has a prominent preamble/banner that:
  - States the doc contains both **Target** and **Current** guidance.
  - Makes clear **Target** is canonical long-term architecture.
  - Makes clear **Current (post‑M2)** is intentionally transient while M3/M4 land.
- Add a short **Current implementation (M2)** subsection (or equivalent) to `foundation.md` and `hydrology.md` that:
  - Points to the current source-of-truth for the M2 slice:
    - `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`
    - `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`
    - `docs/projects/engine-refactor-v1/status.md`
  - Avoids over-describing details likely to churn in M3 (e.g., step registry/task graph wiring).
- Confirm the docs do **not** imply that `PipelineExecutor` / `MapGenStep` / `StepRegistry` are already wired today (unless/when they become true).

## Acceptance Criteria

- [x] `docs/system/libs/mapgen/architecture.md` clearly labels “Target” vs “Current” guidance and points readers to project docs for post‑M2 reality where appropriate.
- [x] `docs/system/libs/mapgen/foundation.md` includes a clear “Current implementation (post‑M2)” subsection and links to the M2 contract + project snapshot docs.
- [x] `docs/system/libs/mapgen/hydrology.md` includes a clear “Current implementation (post‑M2)” subsection and links to the M2 contract + project snapshot docs.
- [x] The added “Current” sections are short, scoped, and explicitly described as transient.
- [x] The target architecture sections remain canonical and are not rewritten to mirror current code line-by-line.

## Out of Scope

- Full architecture doc sweep / full reconciliation of system docs vs implementation details.
- Changing the target architecture/design described in `docs/system/libs/mapgen/*`.
- Re-specifying every data product, step boundary, or pipeline recipe.

## Dependencies / Notes

- Current M2 slice truth:
  - `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`
  - `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`
  - `docs/projects/engine-refactor-v1/status.md`
  - `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md`
  - `docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`
- Related doc alignment work:
  - `docs/projects/engine-refactor-v1/issues/CIV-33-docs-alignment.md`
  - `docs/projects/engine-refactor-v1/issues/CIV-34-foundation-context-contract.md`
- A larger “full system docs sweep” should be tracked separately (see `docs/projects/engine-refactor-v1/triage.md`) once Task Graph / steps / canonical products stabilize.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Keep the “Current” sections extremely short and link-heavy; avoid embedding volatile details that will churn during M3.
- Suggested structure for `foundation.md` / `hydrology.md`:
  - `## Target Architecture` (existing content; canonical)
  - `## Current Implementation (post‑M2)` (new; transient; links to M2 contract/status)
  - `## Migration Notes` (optional; 2–4 bullets max; what will change in M3)
