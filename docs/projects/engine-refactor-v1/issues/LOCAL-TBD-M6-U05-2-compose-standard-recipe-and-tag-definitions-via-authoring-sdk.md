---
id: LOCAL-TBD-M6-U05-2
title: "[M6] Compose standard recipe and tag definitions via authoring SDK"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U05
children: []
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04, LOCAL-TBD-M6-U05-1]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Compose the standard recipe and tag catalog via the authoring SDK.

## Deliverables
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` uses `createRecipe`.
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts` defines the recipe tag catalog.
- Stages are composed explicitly in the recipe.

## Acceptance Criteria
- `createRecipe({ tagDefinitions })` registers the standard tag catalog.
- The recipe composes stages with explicit `requires`/`provides` ordering.
- The recipe can compile an `ExecutionPlan` from a config instance.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- Add a recipe composition test that asserts:
  - tag catalog length + ids match the base list,
  - stage composition order matches the legacy step order,
  - recipe compiles without missing tag errors.

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md), [LOCAL-TBD-M6-U05-1](./LOCAL-TBD-M6-U05-1-translate-base-steps-into-recipe-local-stage-step-files.md)

## Remediation (SPIKE alignment)
- [ ] Align with [SPIKE (M6)](../resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md) by completing [R6](../plans/m6-spike-structure-remediation-plan.md#r6) (tag catalog + validators are mod-owned).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Implement `recipe.ts` to compose stages and derive step ids via the authoring SDK.
- Define `tags.ts` with the standard tag catalog and pass it into `createRecipe`.
- Ensure stage composition mirrors the existing standard ordering.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings
#### P1) Tag catalog extraction inventory (base → recipe-local)
- Tag inventory (from `packages/mapgen-core/src/base/tags.ts`):
  - `artifact:*` (16):
    - `artifact:foundation.plates@v1`
    - `artifact:foundation.dynamics@v1`
    - `artifact:foundation.seed@v1`
    - `artifact:foundation.diagnostics@v1`
    - `artifact:foundation.config@v1`
    - `artifact:heightfield`
    - `artifact:climateField`
    - `artifact:storyOverlays`
    - `artifact:riverAdjacency`
    - `artifact:narrative.corridors@v1`
    - `artifact:narrative.motifs.margins@v1`
    - `artifact:narrative.motifs.hotspots@v1`
    - `artifact:narrative.motifs.rifts@v1`
    - `artifact:narrative.motifs.orogeny@v1`
    - `artifact:placementInputs@v1`
    - `artifact:placementOutputs@v1`
  - `field:*` (5):
    - `field:terrainType`, `field:elevation`, `field:rainfall`, `field:biomeId`, `field:featureType`
  - `effect:*` (6):
    - `effect:engine.landmassApplied`
    - `effect:engine.coastlinesApplied`
    - `effect:engine.riversModeled`
    - `effect:engine.biomesApplied`
    - `effect:engine.featuresApplied`
    - `effect:engine.placementApplied`
- Tags that rely on `satisfies`:
  - All artifacts and fields have `satisfies` predicates; fields/artifacts also use `validateDemo` for demo payloads.
  - Effects use `adapter.verifyEffect` for landmass/coastlines/rivers/biomes/features; `placementApplied` uses `isPlacementOutputSatisfied` (checks placement outputs and expected starts).
- Required helper imports to preserve in `tags.ts`:
  - `validateFoundation*Artifact` and `FOUNDATION_*_TAG` from `@mapgen/core/types` (or mod-owned equivalents if moved).
  - Narrative artifact type guards (`isNarrative*V1`) from narrative domain.
  - Placement input/output guards (`isPlacementInputsV1`, `isPlacementOutputsV1`) currently in base pipeline.

#### P2) Recipe composition shape audit (stages → flattened recipe)
- Legacy order is fixed (see U05 parent); narrative and hydrology steps are interleaved.
- Proposed stage composition that preserves ordering by slicing narrative into multiple stage modules:
  1) `foundation` stage: `foundation`
  2) `morphology` stage: `landmassPlates`, `coastlines`, `ruggedCoasts`, `islands`, `mountains`, `volcanoes`
  3) `narrative-pre` stage: `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridorsPre`
  4) `hydrology-pre` stage: `lakes`, `climateBaseline`
  5) `narrative-swatches` stage: `storySwatches`
  6) `hydrology-core` stage: `rivers`
  7) `narrative-post` stage: `storyCorridorsPost`
  8) `hydrology-post` stage: `climateRefine`
  9) `ecology` stage: `biomes`, `features`
  10) `placement` stage: `derivePlacementInputs`, `placement`
- This avoids non-contiguous steps inside a single stage while preserving the existing step order.

## Implementation Decisions

### Split narrative into multiple stage modules to preserve legacy ordering
- **Context:** Legacy order interleaves narrative and hydrology steps; a single narrative stage would reorder steps.
- **Options:** (A) keep one narrative stage and accept reordering, (B) split narrative into multiple stage modules that preserve ordering.
- **Choice:** Option B — split narrative into `narrative-pre`, `narrative-mid`, `narrative-swatches`, and `narrative-post` stages.
- **Rationale:** Preserves existing behavior while keeping stage modules contiguous and composable.
- **Risk:** Introduces additional stage IDs that must be reflected in any stage-based reporting or tooling.

### Split morphology and narrative-pre into finer stages to match base step order
- **Context:** Base step order interleaves narrative and morphology steps (storySeed → ruggedCoasts → storyOrogeny → islands).
- **Options:** (A) keep coarse `morphology`/`narrative-pre` stages and accept reordered steps, (B) split morphology into pre/mid/post and add a `narrative-mid` stage for ordering.
- **Choice:** Option B — add `morphology-pre`, `morphology-mid`, `morphology-post`, and `narrative-mid`.
- **Rationale:** Preserves legacy step order while keeping stage modules contiguous for config mapping.
- **Risk:** Further expands stage IDs that downstream tooling/configs must reference.
