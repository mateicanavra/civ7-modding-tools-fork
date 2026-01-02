---
id: M5-U11
title: "[M5] DEF-014: foundation inventory (`artifact:foundation.*`) + consumer migration"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Replace the monolithic foundation artifact with a real inventory of discrete `artifact:foundation.*` products, migrate consumers, then delete the blob.

## Goal

Make foundation an explicit, schedulable, verifiable product surface. A single blob artifact blocks fine-grained dependencies and pushes consumers toward implicit coupling.

## Deliverables

- Define the canonical discrete foundation artifact set (mesh/crust/plate graph/tectonics + any required rasters).
- Publish those artifacts under `artifact:foundation.*` with explicit contracts.
- Migrate consumers from the monolithic `artifact:foundation` / `ctx.artifacts.foundation` surface to the discrete inventory.
- Delete the monolithic artifact surface once no longer required.

## Acceptance Criteria

- The discrete `artifact:foundation.*` set exists with clear contracts.
- Consumers no longer require the monolithic foundation blob.
- The monolithic `artifact:foundation` surface is deleted (no transitional blob remains at the end of this unit).

## Testing / Verification

- Standard pipeline run passes under `MockAdapter`.
- Contract tests/guards exist for the discrete artifact inventory (shape/required fields).

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-014); M4 foundation surface cutover (CIV-62) explicitly deferred the split.
- **Sequencing:** easier once extraction is done (M5-U02–U06), but can be started in parallel as long as the end-state ownership boundary is respected.
- **Complexity × parallelism:** medium–high complexity, mixed parallelism (artifact design + consumer migration sequencing).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Keep the inventory contracts crisp; avoid reintroducing “blob as escape hatch.”

## Implementation Decisions

- Split inventory is a 1:1 projection of the existing `FoundationContext` fields into versioned `artifact:foundation.*@v1` tags (no new mesh/crust artifacts without a real in-scope consumer).
- Keep `FoundationContext` + `createFoundationContext()` as an internal convenience for the foundation producer; downstream consumers must depend on the granular artifacts (via `assertFoundationPlates` / `assertFoundationDynamics` / etc).
- Narrow domain APIs that only use plates to accept `FoundationPlateFields` instead of propagating a “blob-by-another-name” composite.

## Prework Findings (Complete)

Goal: enumerate every consumer of the monolithic foundation artifact and propose a discrete `artifact:foundation.*` inventory that lets consumers depend on exactly what they need.

### 1) Consumer inventory (monolithic `artifact:foundation`)

Monolithic artifact surface today:
- Tag id: `artifact:foundation` (`packages/mapgen-core/src/core/types.ts#FOUNDATION_ARTIFACT_TAG`)
- Published by foundation producer:
  - `packages/mapgen-core/src/pipeline/foundation/producer.ts` assigns `context.artifacts.foundation = foundationContext`
- Gated via runtime assertions:
  - `packages/mapgen-core/src/core/assertions.ts` → `assertFoundationContext(...)`

Downstream consumers (via `assertFoundationContext(...)`):

```yaml
foundationArtifactConsumers:
  - consumer: Landmass generation
    location: packages/mapgen-core/src/domain/morphology/landmass/index.ts
    fieldsUsed:
      - plates.id
      - plates.boundaryCloseness
  - consumer: Ocean separation
    location: packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/apply.ts
    fieldsUsed:
      - plates.boundaryCloseness
  - consumer: Rugged coasts
    location: packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts
    fieldsUsed:
      - plates.boundaryCloseness
      - plates.boundaryType
  - consumer: Mountains
    location:
      - packages/mapgen-core/src/domain/morphology/mountains/apply.ts
      - packages/mapgen-core/src/pipeline/morphology/MountainsStep.ts
    fieldsUsed:
      - plates.upliftPotential
      - plates.boundaryType
      - plates.boundaryCloseness
    notes: plus other plate tensors via helpers
  - consumer: Volcanoes
    location: packages/mapgen-core/src/domain/morphology/volcanoes/apply.ts
    fieldsUsed:
      - plates.boundaryCloseness
      - plates.boundaryType
      - plates.shieldStability
  - consumer: Story rifts
    location: packages/mapgen-core/src/domain/narrative/tagging/rifts.ts
    fieldsUsed:
      - plates.riftPotential
      - plates.boundaryType
      - plates.boundaryCloseness
  - consumer: Story orogeny belts
    location: packages/mapgen-core/src/domain/narrative/orogeny/belts.ts
    fieldsUsed:
      - plates.upliftPotential
      - plates.tectonicStress
      - plates.boundaryType
      - plates.boundaryCloseness
      - dynamics.windU
      - dynamics.windV
  - consumer: Climate refine
    location: packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts
    fieldsUsed:
      - dynamics.windU
      - dynamics.windV
      - dynamics.currentU
      - dynamics.currentV
      - dynamics.pressure
  - consumer: Climate swatches monsoon bias
    location: packages/mapgen-core/src/domain/hydrology/climate/swatches/monsoon-bias.ts
    fieldsUsed:
      - dynamics.windU
      - dynamics.windV
  - consumer: Pipeline step wrappers (gating)
    locationPattern: packages/mapgen-core/src/pipeline/*/*Step.ts
    fieldsUsed: []
    notes: Primarily gating via assertFoundationContext(...); domain code uses plates/dynamics as listed above.
```

### 2) Proposed discrete artifact inventory (`artifact:foundation.*`)

Grounded in the current `FoundationContext` shape (`packages/mapgen-core/src/core/types.ts`).

Canonical split (matches the existing `FoundationContext` fields 1:1):
- `artifact:foundation.plates@v1`
  - `id`, `boundaryCloseness`, `boundaryType`, `tectonicStress`, `upliftPotential`, `riftPotential`, `shieldStability`, `movementU`, `movementV`, `rotation`
- `artifact:foundation.dynamics@v1`
  - `windU`, `windV`, `currentU`, `currentV`, `pressure`
- `artifact:foundation.seed@v1`
  - `plateSeed` (`SeedSnapshot`)
- `artifact:foundation.diagnostics@v1`
  - `boundaryTree` (currently `unknown | null`)
- `artifact:foundation.config@v1`
  - `config` snapshot currently stored on the foundation context

Scope boundary note:
- DEF‑014 originally framed “mesh/crust/plateGraph/tectonics” as the conceptual end‑state, but the concrete implementation contract in this repo today is the `FoundationContext` snapshot above.
- This unit closes DEF‑014 by splitting the **existing** `FoundationContext` into discrete artifacts and migrating consumers. We are not inventing new mesh/crust artifacts unless a real consumer exists in-scope for M5.

### 3) Sequencing plan for migration (consumer-first where possible)

Suggested safe migration path:
1. Introduce new artifact tags + satisfaction checks (parallel to the monolith).
2. Update foundation producer to publish:
   - `artifact:foundation.plates@v1`, `artifact:foundation.dynamics@v1`, etc.
   - keep publishing `artifact:foundation` only as a short-lived staging aid inside stacked PRs (must be removed before this unit completes).
3. Update consumers to depend on the narrow artifacts:
   - replace `assertFoundationContext(...)` with targeted asserts:
     - `assertFoundationPlates(...)`
     - `assertFoundationDynamics(...)`
4. Update the standard dependency spine to require/provide the new tags.
5. Delete the monolithic `artifact:foundation` surface and any compat helpers.

Stop-the-world constraints to call out:
- Any step that declares `requires: ["artifact:foundation"]` (via the dependency spine) must be updated in lock-step with tag/producer changes, otherwise plan compilation/execution will fail.
