---
id: LOCAL-TBD-M11-U21
title: "[M11/U21] Resolve PR comment backlog and codify invariants"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: [codex]
labels: [review, quality, invariants, remediation]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: []
blocked: []
related_to: [LOCAL-TBD-M11-U10, LOCAL-TBD-M11-U11, LOCAL-TBD-M11-U13, M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Resolve all actionable PR-comment items in the M11 realism stack and codify the resulting invariants (schema hygiene, boundary semantics, knob clamping, wrap-X adjacency) so they can’t regress.

## Deliverables
- A sequenced remediation pass that clears all **unresolved** items listed in `docs/projects/engine-refactor-v1/reviews/REVIEW-M11-PR-COMMENTS.md`.
- A concrete decision (and doc update if needed) for the schema hygiene conflict: defaults + `additionalProperties` + JSdoc requirements.
- Code fixes landing for:
  - `compute-plate-graph` modularization (rules/strategies split).
  - `compute-crust` boundary-only plate age semantics.
  - `compute-substrate` boundary-closeness propagation semantics.
  - `morphology-mid` erosion rate clamping to schema max.
  - `river-adjacency` wrap-X handling.
  - `plotCoasts` buffer-sync decision (and implementation if required).
- Guardrails: tests or lint checks added where needed to prevent reintroducing the same class of issues.

## Acceptance Criteria
- Every actionable PR comment in the review doc is marked **resolved** or **superseded** with evidence.
- The schema hygiene rule-set is unambiguous and documented in the appropriate canonical doc.
- At least one automated check exists for each new invariant (tests, lint, or strict validation).
- No regressions in the standard stack build/tests for the touched domains.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test -- test/foundation/mesh-first-ops.test.ts`
- `pnpm -C mods/mod-swooper-maps test -- test/morphology/sea-level-land-balance.test.ts`
- `pnpm -C mods/mod-swooper-maps test -- test/morphology/standard-run.test.ts`
- `pnpm -C mods/mod-swooper-maps test -- test/morphology/mesh-first-ops.test.ts`

## Dependencies / Notes
- Review source of truth:
  - [REVIEW-M11-PR-COMMENTS](../reviews/REVIEW-M11-PR-COMMENTS.md)
- Related:
  - [LOCAL-TBD-M11-U10](./LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md)
  - [LOCAL-TBD-M11-U11](./LOCAL-TBD-M11-U11-foundation-tectonic-segments-and-history.md)
  - [LOCAL-TBD-M11-U13](./LOCAL-TBD-M11-U13-foundation-crust-load-bearing-prior.md)
  - [M11-U00](./M11-U00-physics-first-realism-upgrade-plan.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Sequencing (priority order)

P0 — **Decisions first (avoid rework):**
- Reconcile schema hygiene rules (defaults, `additionalProperties`, JSdoc/description alignment). Decide canonical policy and update the doc(s) that conflict.

P1 — **Foundational invariants:**
- Split `compute-plate-graph` into rules/strategies (thin op entry).
- Fix boundary-only plate age (youngest at boundaries).

P2 — **Behavioral semantics:**
- Propagate boundary closeness into interior tiles for substrate rules.
- Clamp geomorphology rates to schema max after knob multipliers.

P3 — **Gameplay projection correctness:**
- Wrap-X river adjacency.
- Decide + implement `expandCoasts` buffer sync (or explicitly document why not).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
