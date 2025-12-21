---
id: M4-PLACEMENT-INPUTS
title: "[M4] Placement inputs: publish artifact:placementInputs@v1 and cut placement to consume it"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Placement]
parent: null
children: []
blocked_by: [M4-PIPELINE-CUTOVER]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make placement testable and explicit: publish `artifact:placementInputs@v1` as a stable, TS-canonical product and require placement to consume it. Placement provides a verified `effect:*` and does not rely on implicit engine reads as its dependency surface.

## Why This Exists

DEF-006 keeps placement as an engine-effect step without a single canonical inputs artifact. The accepted target architecture prefers reification-first and explicit products for cross-step dependencies.

This issue closes DEF-006.

## Recommended Target Scope

### In scope

- Define `artifact:placementInputs@v1` (versioned) with a safe demo payload.
- Add a derive step that produces `placementInputs@v1` from explicit prerequisites.
- Update placement to require the inputs artifact and stop assembling/reading implicit inputs inside the placement step.
- Provide a verified `effect:*` tag for placement (adapter-backed postcondition).

### Out of scope

- Overhauling placement algorithms or tuning.
- Building a full engine-less placement simulator.

## Acceptance Criteria

- `artifact:placementInputs@v1` exists in the registry with a safe demo payload.
- A derive step produces it from explicit prerequisites and publishes it in context artifacts.
- Placement requires `artifact:placementInputs@v1` and no longer relies on `state:*` tags for ordering.
- Placement provides `effect:*` (verified) describing application to the engine surface.

## Primary Touchpoints (Expected)

- Placement step and its dependencies:
  - `packages/mapgen-core/src/pipeline/placement/*`
  - `packages/mapgen-core/src/pipeline/ecology/*` (if placement consumes ecology outputs)
- Deferral status:
  - `docs/projects/engine-refactor-v1/deferrals.md` (DEF-006 status update)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend a smoke test that compiles and executes placement with a stub adapter and a demo `placementInputs@v1`.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Define the inputs artifact

- Specify `placementInputs@v1` fields to match what placement actually consumes today.
- Include a minimal safe demo payload that does not crash downstream code.

### 2) Implement the derive step

- Add a step that:
  - requires the prerequisite fields/artifacts
  - produces `artifact:placementInputs@v1`
  - is part of the standard recipe before placement

### 3) Update placement to consume the artifact

- Remove internal “gather inputs from engine/state” assembly that is now represented in `placementInputs@v1`.
- Make placement read exclusively from the artifact + any explicitly declared prerequisites.

### 4) Publish a verified effect

- Placement provides `effect:*` (e.g., `effect:engine.placementApplied`) with a postcondition check via adapter.

### 5) Update DEF-006 status

- Mark DEF-006 resolved when placement’s inputs contract is explicit and testable.

