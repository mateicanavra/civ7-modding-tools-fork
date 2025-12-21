---
id: M4-EFFECTS-VERIFICATION
title: "[M4] Effects verification: replace state:engine.* with verified effect:* + reification"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Validation]
parent: null
children: []
blocked_by: [M4-PIPELINE-CUTOVER]
blocked: []
related_to: [CIV-47]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make engine-surface prerequisites **first-class and verifiable**: replace `state:engine.*` with `effect:*` tags that participate in scheduling and are verified via adapter-backed postconditions. Reify any engine-derived values that become cross-step dependencies into `field:*` / `artifact:*`.

## Why This Exists

`state:engine.*` is a trusted, non-verifiable namespace carried for migration convenience. The accepted target policy is adapter-only + reification-first + verifiable `effect:*` (no “asserted but unverified” effects).

This issue closes DEF-008.

## Recommended Target Scope

### In scope

- Introduce verifiable `effect:*` tags for the highest-risk engine mutations (biomes/features/placement; others if they are cheap).
- Add adapter-backed postcondition checks for those effects (fail-fast).
- Reify engine-derived values into fields/artifacts when they become cross-step dependencies.
- Fence `state:engine.*` to migration-only compatibility (no new uses; remove from target registry surface).

### Out of scope

- Broad algorithm changes (keep behavior stable except for stronger validation).
- Exhaustive engine verification coverage for every effect (start with high-risk).
- Rewriting adapter APIs beyond what is necessary for minimal postconditions/reification.

## Acceptance Criteria

- No step in the standard pipeline requires/provides `state:engine.*` in the target registry surface.
- Highest-risk engine-coupled steps provide verifiable `effect:*` and perform adapter-backed postcondition checks.
- Any cross-step dependency currently satisfied by “read engine later” is replaced by an explicit reified `field:*` / `artifact:*` product.
- Failures are loud (compile-time where possible; runtime postcondition failures otherwise); no silent skips.

## Primary Touchpoints (Expected)

- Tag definitions / registry rules:
  - `docs/system/libs/mapgen/architecture.md` (“Engine Boundary Policy (Accepted)”)
  - `docs/projects/engine-refactor-v1/deferrals.md` (DEF-008 status update)
- Engine-coupled steps (likely):
  - `packages/mapgen-core/src/pipeline/ecology/*`
  - `packages/mapgen-core/src/pipeline/placement/*`
  - `packages/mapgen-core/src/pipeline/*` where `state:engine.*` is currently declared

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add or extend one smoke test that exercises each newly-verified effect path under a stub adapter.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Inventory current `state:engine.*` usage

- Locate all `requires`/`provides` that mention `state:engine.*`.
- Map each to:
  - What engine mutation it represents.
  - Whether a postcondition can be verified immediately via the adapter.
  - Whether any later steps depend on a value that currently requires “read engine later”.

### 2) Define verified `effect:*` tags

- For each prioritized engine mutation, define a corresponding `effect:*` tag:
  - Example: `effect:engine.biomesApplied`, `effect:engine.featuresApplied`, `effect:engine.placementApplied`.

### 3) Add adapter-backed postconditions

- For each provided effect, add a postcondition check that can fail-fast.
- Keep checks minimal and robust (avoid expensive full scans unless necessary).

### 4) Reify cross-step dependencies

- If a later step needs a value that is currently “only in the engine”, publish it as `field:*` / `artifact:*` at the boundary step that reads it.
- Prefer reify-after-mutate patterns:
  - mutate engine via adapter
  - reify results immediately into fields/artifacts
  - provide the field/artifact + provide the verified effect tag

### 5) Fence/remove `state:engine.*`

- Remove `state:engine.*` from the target registry tag surface and from standard pipeline steps.
- If any compatibility is needed, isolate it explicitly (migration-only adapter or step), not as a general dependency surface.

### 6) Update DEF-008 status

- Mark DEF-008 resolved when the target registry no longer exposes `state:engine.*` and the high-risk effects are verified.

