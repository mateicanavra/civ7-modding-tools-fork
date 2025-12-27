---
id: CIV-64
title: "[M4] Placement inputs: publish artifact:placementInputs@v1 and cut placement to consume it"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Placement]
parent: null
children: [CIV-71, CIV-72]
blocked_by: [CIV-54, CIV-68]
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

- Define `artifact:placementInputs@v1` (versioned); demo payloads are optional (validate when present).
- Add a derive step that produces `placementInputs@v1` from explicit prerequisites.
- Update placement to require the inputs artifact and stop assembling/reading implicit inputs inside the placement step.
- Provide a verified `effect:*` tag for placement (adapter-backed postcondition).
- Coordinate with the effect tag catalog (CIV-68) so placement’s effect is schedulable and verifiable.

### Out of scope

- Overhauling placement algorithms or tuning.
- Building a full engine-less placement simulator.

## Acceptance Criteria

- `artifact:placementInputs@v1` exists in the registry; demo payloads are optional (validate when present).
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

## Dependencies / Notes

- This is Phase E work; it should land after the pipeline cutover phases (RunRequest/ExecutionPlan and legacy ordering deletion).
- Placement effect verification depends on the effect tag catalog + adapter postcondition surfaces (CIV-68).
- Placement inputs may require upstream reification; avoid DEF-010 scope creep in M4.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Define the inputs artifact

- Specify `placementInputs@v1` fields to match what placement actually consumes today.
- If a demo payload is provided, keep it minimal and safe for downstream code.

### 2) Implement the derive step

- Add a step that:
  - requires the prerequisite fields/artifacts
  - produces `artifact:placementInputs@v1`
  - is part of the standard recipe before placement

### 3) Update placement to consume the artifact

- Remove internal “gather inputs from engine/state” assembly that is now represented in `placementInputs@v1`.
- Make placement read exclusively from the artifact + any explicitly declared prerequisites.

### 4) Publish a verified effect

- Placement provides `effect:*` (e.g., `effect:engine.placementApplied`) verified via a minimal TS-owned `artifact:placementOutputs@v1` (ADR-ER1-020).

### 5) Update DEF-006 status

- Mark DEF-006 resolved when placement’s inputs contract is explicit and testable.

## Prework Prompt (Agent Brief)

Goal: verify the placement-inputs prework artifacts are complete and aligned before implementation.

Deliverables:
- A short readiness checklist pointing to the child prework artifacts for:
  - `artifact:placementInputs@v1` schema sketch + source mapping.
  - Placement cutover checklist + effect verification hook plan.
- A brief gap list if any placement input source is unclear or relies on implicit engine reads.

Where to look:
- Child issues: `docs/projects/engine-refactor-v1/issues/CIV-71-M4-placement-inputs-1-define-artifact.md`,
  `docs/projects/engine-refactor-v1/issues/CIV-72-M4-placement-inputs-2-cutover.md`.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (placement artifact),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.7).
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Placement inputs must be explicit and TS-canonical; no implicit engine reads as dependency surface.
- Placement effects must be verified (`effect:engine.placementApplied`).
- Do not implement code; deliver only the checklist + gaps as notes.
- Coordinate with the effect tag catalog so placement’s effect is schedulable in the registry.

## Prework Results / References

Child artifacts:
- Placement‑1 (`CIV-71`): `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-placement-1-placementinputs-v1-contract.md`
- Placement‑2 (`CIV-72`): `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-placement-2-cutover-checklist.md`

Readiness checklist:
- `artifact:placementInputs@v1` contract is sketched and maps directly to current runtime wiring (mapInfo + resolved starts + placement config); derive step should be able to publish it mechanically.
- Cutover checklist enumerates every current placement input assembly site and the source→artifact mappings needed to remove implicit `ctx.config` and runtime-only closure inputs.
- Coordinate with Effects‑1/Effects track so `effect:engine.placementApplied` is definable, schedulable in the registry, and has a verification story.

Decisions:
- `effect:engine.placementApplied` verification uses a minimal TS-owned `artifact:placementOutputs@v1` (ADR-ER1-020).
- Demo payloads for `artifact:placementInputs@v1` omit `starts` by default (engine-free “won’t crash” demos); include `starts` only in explicit engine-backed/integration tests (ADR-ER1-023).
