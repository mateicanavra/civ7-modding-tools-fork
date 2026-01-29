---
id: LOCAL-TBD-M11-U15
title: "[M11/U15] Foundation realism execution spine (organizing issue for U10–U14)"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, realism, planning, contracts]
parent: null
children:
  - LOCAL-TBD-M11-U10
  - LOCAL-TBD-M11-U11
  - LOCAL-TBD-M11-U12
  - LOCAL-TBD-M11-U13
  - LOCAL-TBD-M11-U14
blocked_by: []
blocked: []
related_to: [M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Define the single, coherent (no-shims) execution order + shared invariants for making Foundation “realism-by-default” (plates → belts/history → polar → crust prior → guardrails) and align U10–U14 as one physics-first cutover spine.

## Deliverables
- **Shared slice invariants (U10–U14; canonical list; reference by ID, do not restate elsewhere)**
  - **FND-INV-CYLINDER-TOPOLOGY:** cylinder topology everywhere (`wrapX=true`, `wrapY=false`) for partitioning, topology, tectonics, and projections; not a config flag.
  - **FND-INV-DETERMINISM:** same `{seed, config, dimensions}` ⇒ identical outputs for any `artifact:foundation.*` touched by these issues.
  - **FND-INV-NO-DUAL-PATHS:** no shims/dual paths; cut over cleanly (no legacy Voronoi partition, no legacy neighbor-scan tectonics, no polar injection fallbacks).
  - **FND-INV-TRUTH-PROJECTION-BOUNDARY:** mesh truth artifacts are authoritative; tile tensors are explicit projections; no `artifact:map.*`/engine surfaces in Foundation truth.
  - **FND-INV-DRIVER-KNOBS-ONLY:** author knobs steer physical drivers (cost fields, kernel widths, era weights), not post-hoc outcome clamps.
  - **FND-INV-NO-LATITUDE-OVERRIDES:** no latitude/`y`-band logic that injects regimes/intensities or projection seeds (poles emerge from topology + kinematics).
- **Execution order (sequential by policy; do not parallelize these slices)**
  - U10: plate partition realism + topology artifact.
  - U11: segment-based tectonics + 3-era history + delete legacy tectonics + delete polar projection hacks.
  - U12: polar caps as explicit plates (policy + kinematics + legibility; no latitude forcing).
  - U13: crust as a load-bearing prior + isostasy baseline drivers + wire Morphology baseline.
  - U14: realism invariants + traces (plates/belts/mountains) to prevent regressions.
- Cross-issue contract alignment:
  - Each issue stays single-path; any deletion required to remove legacy behavior is owned by the slice that replaces it (no “keep old around” cleanups).
  - Each issue publishes explicit artifacts at step boundaries; consumers opt into projections intentionally.

## Acceptance Criteria
- U10–U14 can be read as a single plan with:
  - one canonical invariants list (this issue),
  - one explicit execution order,
  - no overlapping ownership that would require parallel edits to the same core files/steps.
- “No dual paths” posture is enforced by sequencing:
  - U11 owns deletion of polar injection and projection hacks, and later issues do not re-introduce latitude-based behavior as a fallback.
- Each child issue links back to this issue for the shared invariants and execution order.

## Testing / Verification
- N/A (organizing issue).
- Verification is performed in child issues; U14 consolidates the cross-domain regression suite.

## Dependencies / Notes
- Related plan:
  - `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`
- Child issues (this spine):
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U11-foundation-tectonic-segments-and-history.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U12-foundation-polar-caps-as-plates.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U13-foundation-crust-load-bearing-prior.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U14-validation-observability-realism-dashboard.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
