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
- The monolithic artifact surface is deleted (or reduced to a derived transitional artifact only if temporarily unavoidable and time-bounded).

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

## Prework Prompt (Agent Brief)

Goal: make the split and migration safe by enumerating consumers and designing the discrete artifact inventory up front.

Deliverables:
- Inventory of all consumers of the monolithic foundation artifact (direct and transitive).
- Proposed discrete artifact set, including contract notes for each artifact (required fields, versioning).
- A sequencing plan for consumer migration (which consumers must migrate first) and any stop-the-world constraints.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

Goal: enumerate every consumer of the monolithic foundation artifact and propose a discrete `artifact:foundation.*` inventory that lets consumers depend on exactly what they need.

### 1) Consumer inventory (monolithic `artifact:foundation`)

Monolithic artifact surface today:
- Tag id: `artifact:foundation` (`packages/mapgen-core/src/core/types.ts#FOUNDATION_ARTIFACT_TAG`)
- Published by foundation producer:
  - `packages/mapgen-core/src/pipeline/foundation/producer.ts` assigns `context.artifacts.foundation = foundationContext`
- Gated via runtime assertions:
  - `packages/mapgen-core/src/core/assertions.ts` → `assertFoundationContext(...)`

Downstream consumers (via `assertFoundationContext(...)`):

| Consumer | Location | Fields used (high level) |
| --- | --- | --- |
| Landmass generation | `packages/mapgen-core/src/domain/morphology/landmass/index.ts` | `plates.id`, `plates.boundaryCloseness` |
| Ocean separation | `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/apply.ts` | `plates.boundaryCloseness` |
| Rugged coasts | `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` | `plates.boundaryCloseness`, `plates.boundaryType` |
| Mountains | `packages/mapgen-core/src/domain/morphology/mountains/apply.ts` + `pipeline/morphology/MountainsStep.ts` | `plates.upliftPotential`, `plates.boundaryType`, `plates.boundaryCloseness` (plus other plate tensors via helpers) |
| Volcanoes | `packages/mapgen-core/src/domain/morphology/volcanoes/apply.ts` | `plates.boundaryCloseness`, `plates.boundaryType`, `plates.shieldStability` |
| Story rifts | `packages/mapgen-core/src/domain/narrative/tagging/rifts.ts` | `plates.riftPotential`, `plates.boundaryType`, `plates.boundaryCloseness` |
| Story orogeny belts | `packages/mapgen-core/src/domain/narrative/orogeny/belts.ts` | `plates.upliftPotential`, `plates.tectonicStress`, `plates.boundaryType`, `plates.boundaryCloseness`, plus `dynamics.windU/windV` |
| Climate refine | `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts` | `dynamics.*` (wind/currents/pressure) |
| Climate swatches monsoon bias | `packages/mapgen-core/src/domain/hydrology/climate/swatches/monsoon-bias.ts` | `dynamics.windU/windV` |
| Pipeline step wrappers | `packages/mapgen-core/src/pipeline/*/*Step.ts` that call `assertFoundationContext(...)` | Primarily gating; then domain uses plates/dynamics as above |

### 2) Proposed discrete artifact inventory (`artifact:foundation.*`)

Grounded in the current `FoundationContext` shape (`packages/mapgen-core/src/core/types.ts`):

Minimum viable split (matches current tensors):
- `artifact:foundation.plates@v1`
  - `id`, `boundaryCloseness`, `boundaryType`, `tectonicStress`, `upliftPotential`, `riftPotential`, `shieldStability`, `movementU`, `movementV`, `rotation`
- `artifact:foundation.dynamics@v1`
  - `windU`, `windV`, `currentU`, `currentV`, `pressure`
- `artifact:foundation.seed@v1` (optional but useful for debugging/replay)
  - `plateSeed` (`SeedSnapshot`)
- `artifact:foundation.diagnostics@v1` (optional; mostly dev)
  - `boundaryTree` (currently `unknown | null`)
- `artifact:foundation.config@v1` (optional)
  - `config` snapshot currently stored on the foundation context

Note: the deferral mentions mesh/crust/plate graph; those are not currently published as first-class artifacts. If needed, introduce additional artifacts only once consumers exist (avoid inventing new products without consumers).

### 3) Sequencing plan for migration (consumer-first where possible)

Suggested safe migration path:
1. Introduce new artifact tags + satisfaction checks (parallel to the monolith).
2. Update foundation producer to publish:
   - `artifact:foundation.plates@v1`, `artifact:foundation.dynamics@v1`, etc.
   - keep publishing `artifact:foundation` temporarily (time-bounded).
3. Update consumers to depend on the narrow artifacts:
   - replace `assertFoundationContext(...)` with targeted asserts:
     - `assertFoundationPlates(...)`
     - `assertFoundationDynamics(...)`
4. Update the standard dependency spine to require/provide the new tags.
5. Delete the monolithic `artifact:foundation` surface and any compat helpers.

Stop-the-world constraints to call out:
- Any step that declares `requires: ["artifact:foundation"]` (via the dependency spine) must be updated in lock-step with tag/producer changes, otherwise plan compilation/execution will fail.
