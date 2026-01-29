id: LOCAL-TBD-placement-domain-refactor
title: Refactor placement domain to operation modules
state: in_progress
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Placement domain inventory for the op-module refactor, including step map, dependency contracts, config surfaces, typed arrays, and boundary violations.

## Deliverables
- Documented placement domain inventory covering steps, dependencies, config, typed arrays, and boundary violations to support the refactor.

## Acceptance Criteria
- Inventory lists are complete for placement steps, dependency contracts, config surfaces, typed arrays, and boundary violations.

## Testing / Verification
- N/A (documentation-only inventory).

## Dependencies / Notes
- Canonical references: SPEC-step-domain-operation-modules, ADRs ER1-030/034/035, SPEC-global-invariants.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Scratch space for exploration notes or prompts. Do not sync this section to Linear.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Domain Inventory

#### A) Step map (call sites)
- `standard.placement.derivePlacementInputs` (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/index.ts`)
  - Requires: `effect:engine.coastlinesApplied`, `effect:engine.riversModeled`, `effect:engine.featuresApplied`.
  - Provides: `artifact:placementInputs`.
  - Calls: `planStarts`, `planWonders`, and `planFloodplains` to resolve step-ready plan inputs from runtime state and config.
- `standard.placement.placement` (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/index.ts`)
  - Requires: `artifact:placementInputs`.
  - Provides: `artifact:placementOutputs`, `effect:engine.placementApplied`.
  - Calls: applies plan outputs to adapter (natural wonders, floodplains, starts, discoveries, fertility, advanced start).

#### B) Dependency contracts (keys + ownership)
- `artifact:placementInputs` (artifact) — provided by `derivePlacementInputs`, consumed by `placement`; satisfies via `isPlacementInputsV1` (tag definition in `standard/tags.ts`), owner: placement stage.
- `artifact:placementOutputs` (artifact) — provided by `placement`; satisfaction via `isPlacementOutputsV1`, used by placement effect verification; owner: placement stage.
- `effect:engine.placementApplied` (effect) — provided by `placement`; verified via adapter hook in tag definition; owner set to placement step in `EFFECT_OWNERS`.
- Upstream required effects: `effect:engine.coastlinesApplied`, `effect:engine.riversModeled`, `effect:engine.featuresApplied` (produced in prior stages; verified via adapter).

#### C) Config surfaces (schemas, defaults, fixups)
- Op-owned schemas in `mods/mod-swooper-maps/src/domain/placement/ops/**/schema.ts` (re-exported via `mods/mod-swooper-maps/src/config/schema/placement.ts`):
  - `PlanWondersConfigSchema` (wondersPlusOne default true).
  - `PlanFloodplainsConfigSchema` (minLength default 4, maxLength default 10, validated max>=min).
  - `PlanStartsConfigSchema` (optional overrides; base starts passed as op input).
- Runtime shaping:
  - `derivePlacementInputs` runs the above ops to produce plan outputs (wonders count, floodplain bounds, resolved starts) and stores both plan outputs and configs in the artifact.
  - Placement step consumes artifact plan outputs directly; no runtime config merges beyond op validation.

#### D) Typed arrays + invariants
- None in placement domain boundaries; inputs/outputs are scalar POJOs (map sizes, config objects, start position arrays from adapter).

#### E) Boundary violations to eliminate
- Domain ops avoid adapter/runtime imports; adapter interactions are confined to placement step apply.
- Placement steps import op config/defaults directly from the placement domain.
- Runtime config merging has been replaced by op-backed defaults/resolution.
