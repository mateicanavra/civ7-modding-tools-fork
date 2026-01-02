---
id: LOCAL-TBD-M7-U09
title: "[M7] Own ecology feature + vegetation placement (replace vanilla addFeatures)"
state: planned
priority: 2
estimate: 16
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: [LOCAL-TBD-M7-U08]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace the ecology “features” baseline from `adapter.addFeatures` (vanilla) to a mod-owned, requirements-driven feature placement pass that respects Civ7 engine constraints and data tables.

## Deliverables
- A mod-owned feature placement entrypoint (domain code) that can place non-wonder features (vegetation, wet, aquatic, ice) without calling vanilla `adapter.addFeatures`.
- A stage/step wrapper that wires the new placement into the standard ecology stage (with a config flag to fall back to vanilla while stabilizing).
- A small, explicit “requirements model” derived from Civ7 base data and engine surfaces (not a copy of Civ’s module structure):
  - placement classes
  - density controls
  - latitude gating for aquatic/ice
  - validation gates (`canHaveFeature`, “no feature”, “not navigable river”, etc.)
- Expanded adapter/SDK constants/types (if needed) so “feature lists” are complete and not accidentally interpreted as exhaustive when they are not.
- Tests that lock core invariants and prevent regressions (marine biome, water/land constraints, and can-have-feature gating).
- Docs update: link the spike + document the new ownership boundary (what ecology owns vs what remains in placement/engine).

## Acceptance Criteria
- The ecology features step can run with vanilla feature placement disabled and still produce a valid map (no missing required biomes/features, no engine crashes).
- All placements are gated by `adapter.canHaveFeature(...)` and never overwrite existing features.
- Vegetated features are never placed on water tiles or navigable rivers.
- Aquatic features respect `MinLatitude/MaxLatitude` (or equivalent normalized metadata) and avoid lakes when required (e.g. `NoLake`).
- Ice placement is limited to high latitudes and avoids adjacency to land and natural wonders (or a documented equivalent exclusion policy).
- The config flag can switch between vanilla baseline and mod-owned baseline without changing the rest of the pipeline contract.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm lint`
- `pnpm check`
- `pnpm build`
- `pnpm run deploy:mods`

## Dependencies / Notes
- Spike: `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-feature-placement-ownership.md`
- Civ7 base sources:
  - `Base/modules/base-standard/maps/feature-biome-generator.js`
  - `Base/modules/base-standard/data/terrain.xml`
- Related: `LOCAL-TBD-M7-U08` (biome requirements + constants parity; must remain green).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Current state (inventory)

- Baseline feature placement is still vanilla:
  - `mods/mod-swooper-maps/src/domain/ecology/features/index.ts` calls `adapter.addFeatures(...)`
  - adapter wraps `/base-standard/maps/feature-biome-generator.js` `addFeatures(...)`
- Ecology currently only adds *tweaks* after vanilla (reefs/volcanic vegetation/density tweaks).

### Target approach (requirements-driven, not a Civ7 clone)

1) Normalize feature metadata from Civ7 data (via adapter / GameInfo):
   - placement class, density, latitude constraints, `NoLake`, etc.
2) Compute candidate plots per placement class (coastal/near-river/scatter/aquatic/ice).
3) Apply a mod-owned sampling strategy:
   - deterministic seeded random
   - spacing/adjoin rules where needed (mod-owned policy)
4) Apply placements with a single canonical engine validation gate:
   - `adapter.canHaveFeature(x, y, featureIdx)` must be true at placement time.

### Proposed file structure (illustrative)

```
mods/mod-swooper-maps/src/domain/ecology/
  feature-placement/
    index.ts
    types.ts
    engine-data/
      feature-metadata.ts
      placement-classes.ts
    rules/
      candidates/
      validators/
      samplers/
    apply/
      apply-intents.ts
      stats.ts
```

### Phasing (recommended)

Keep risk low by swapping the baseline in feature-group phases, each guarded by a config flag while stabilizing.

- Phase 1: aquatic + ice (reef/cold reef/atoll/lotus + ice)
- Phase 2: vegetated scatter features (forest/rainforest/taiga/savanna/sagebrush)
- Phase 3: wet/isolate features (marsh/mangrove/oasis/watering hole/tundra bog)
- Phase 4: remove vanilla baseline by default (keep fallback switch for debugging)

### Tests (recommended)

- Unit tests:
  - placement class candidate generation
  - latitude gating for aquatic/ice features
  - spacing/adjacency policies (as they are introduced)
- Integration-ish tests (MockAdapter grid):
  - never overwrite existing features
  - never place disallowed features on disallowed tiles (water/navigable river)
  - `canHaveFeature` is always checked and enforced

## Implementation Decisions

### Phase feature ownership by “placement class groups”
- **Context:** Full feature placement ownership is large and spans multiple rule types; risk of regression is high if swapped all-at-once.
- **Options:** Big-bang replacement; phased replacement by feature group; keep vanilla forever and only tweak.
- **Choice:** Phase replacement by feature groups, starting with aquatic + ice.
- **Rationale:** Aquatic/ice have the clearest, most explicit requirements (latitude, water-only) and lowest coupling.
- **Risk:** Temporary mixed-mode behavior while phases land; must keep the fallback switch and add regression tests per phase.

### Defer floodplains “full ownership” until a river topology contract exists
- **Context:** Floodplains are placed via `TerrainBuilder.addFloodplains(...)` and are deeply tied to river semantics; user explicitly flagged “skip if it requires modeling rivers”.
- **Options:** Keep calling engine `addFloodplains`; reimplement floodplains placement fully; define a hybrid contract (mod chooses parameters/candidates, engine applies).
- **Choice:** Defer full floodplains ownership; keep engine call in placement for now and revisit once we define a minimal river adjacency/topology contract.
- **Rationale:** Avoid crossing into hydrology while still keeping correctness and compatibility.
- **Risk:** Some “environment look” remains engine-controlled until a follow-up issue lands.

