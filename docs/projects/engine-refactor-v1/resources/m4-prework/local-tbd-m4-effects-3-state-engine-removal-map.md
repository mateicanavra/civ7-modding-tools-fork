# Prework — `LOCAL-TBD-M4-EFFECTS-3` (Remove `state:engine.*` surface)

Goal: make the `state:engine.*` removal mechanical by enumerating every remaining usage and its intended replacement (`effect:*`, `field:*`, `artifact:*`, or deletion), plus a cleanup checklist to close DEF‑008 once the target contract is clean.

## Inventory (current `state:engine.*` usage)

### Canonical tag definitions + validation

`packages/mapgen-core/src/pipeline/tags.ts`
- Defines the full `state:engine.*` tag set:
  - `state:engine.landmassApplied`
  - `state:engine.coastlinesApplied`
  - `state:engine.riversModeled`
  - `state:engine.biomesApplied`
  - `state:engine.featuresApplied`
  - `state:engine.placementApplied`
- Allows them via `STATE_RE` and the `M3_CANONICAL_DEPENDENCY_TAGS` allowlist.

### Standard pipeline dependencies (the big one)

`packages/mapgen-core/src/pipeline/standard.ts` (`M3_STAGE_DEPENDENCY_SPINE`)
- Provides / requires `M3_DEPENDENCY_TAGS.state.*` across multiple stages:
  - `landmassPlates` → provides `landmassApplied`
  - `coastlines` → requires `landmassApplied`, provides `coastlinesApplied`
  - `storySeed` / `storyHotspots` / `storyRifts` / `storyOrogeny` / `storyCorridorsPre` → require `coastlinesApplied`
  - `ruggedCoasts` → requires `coastlinesApplied`, provides `coastlinesApplied` (re-publish)
  - `islands` / `mountains` / `volcanoes` → provide `landmassApplied` (re-publish)
  - `lakes` → requires `landmassApplied`
  - `rivers` → provides `riversModeled`
  - `storyCorridorsPost` → requires `coastlinesApplied`
  - `biomes` / `features` / `placement` → use `biomesApplied` / `featuresApplied` / `placementApplied`

### Tests that assert contracts using `state.*`

- `packages/mapgen-core/test/pipeline/artifacts.test.ts`
  - Asserts `storyCorridorsPost` requires includes `M3_DEPENDENCY_TAGS.state.coastlinesApplied`.
- `packages/mapgen-core/test/pipeline/placement-gating.test.ts`
  - Uses `M3_DEPENDENCY_TAGS.state.*` in mocked provides and expects missing `state.featuresApplied`.

### Schema / docs strings

`packages/mapgen-core/src/config/schema.ts`
- Stage descriptor descriptions explicitly reference `state:engine.*`.

### Deferrals

`docs/projects/engine-refactor-v1/deferrals.md`
- DEF‑008 documents that `state:engine.*` is “trusted” and transitional.

## Replacement map (per tag / usage)

| Current `state:engine.*` | Primary replacement | Where it lands | Notes / constraints |
| --- | --- | --- | --- |
| `state:engine.biomesApplied` | `effect:engine.biomesApplied` + `field:biomeId` | Effects‑1/2 + Tag Registry Cutover | Biomes is engine-first today; reify `field:biomeId` immediately after mutate so downstream doesn’t read engine. |
| `state:engine.featuresApplied` | `effect:engine.featuresApplied` + `field:featureType` | Effects‑1/2 + Tag Registry Cutover | Features currently reads biomes via adapter; switch to field consumption once biomes reifies. |
| `state:engine.placementApplied` | `effect:engine.placementApplied` (+ minimal placement outputs for verification) | Effects‑1 + Placement Inputs | Placement verification likely needs a TS-owned `artifact:placementOutputs@v1` or a dedicated adapter read surface. |
| `state:engine.riversModeled` | **Prefer:** `artifact:riverAdjacency` | Pipeline dependency spine + tests | Rivers already publishes `artifact:riverAdjacency` (runtime-verifiable); this can replace the placement prereq without introducing a new effect verifier. |
| `state:engine.coastlinesApplied` | `effect:engine.coastlinesApplied` (or a reified artifact if we define one) | Tag Registry Cutover + pipeline cutover | Coastlines is an engine-first mutation (`adapter.expandCoasts`). Verification likely needs a small adapter read (or a cheap invariant check) to avoid “asserted but unverified” behavior. |
| `state:engine.landmassApplied` | `effect:engine.landmassApplied` (or a reified artifact if we define one) | Tag Registry Cutover + pipeline cutover | Landmass step marks LandmassRegionId / plot tags but adapter lacks read APIs; verification likely requires adapter read surface (see Engine Boundary Cleanup). |

## Cleanup checklist (mechanical steps)

1) **Replace scheduling edges**
   - Update `M3_STAGE_DEPENDENCY_SPINE` so no stage `requires/provides` `state:engine.*`.
   - Prefer swapping `riversModeled` → `artifact:riverAdjacency` where it’s the real prerequisite.
2) **Remove `state:engine.*` from the canonical contract**
   - Tag registry surface must reject/omit `state:*` as schedulable tags (accept only `artifact:*`, `field:*`, `effect:*`).
   - Remove `STATE_RE` + `M3_DEPENDENCY_TAGS.state` allowlisting in the target path.
3) **Update tests**
   - Update gating tests to expect missing `effect:*` (or missing artifacts/fields where appropriate).
4) **Update schema descriptions**
   - Replace `state:engine.*` mentions with `effect:*` (or “engine effects”) in `StageDescriptorSchema` docs.
5) **Close DEF‑008**
   - Mark DEF‑008 resolved once the target dependency language is `artifact:*`/`field:*`/verified `effect:*` only, and no standard steps use `state:engine.*`.

## Coordination notes (what blocks this)

- Effects‑2 must land first for biomes/features (`effect:*` verifiers + reified fields).
- Placement inputs cutover must land first so placement doesn’t rely on a `state:*` edge with no verification story.
- Engine Boundary Cleanup likely needs to supply any missing adapter read surfaces required to verify landmass/coastline effects (if those remain as effects rather than reified artifacts).

