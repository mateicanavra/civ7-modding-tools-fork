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
- Replace the ecology “features” baseline from `adapter.addFeatures` (vanilla) to a mod-owned feature placement pass that owns the full set of Civ7 base-standard non-wonder features while respecting engine validity rules.

## Deliverables
- A mod-owned baseline feature placement implementation that can run with **no** `adapter.addFeatures(...)` call and place these Civ7 base-standard, non-wonder, non-floodplain features:
  - Vegetated (scatter): `FEATURE_FOREST`, `FEATURE_RAINFOREST`, `FEATURE_TAIGA`, `FEATURE_SAVANNA_WOODLAND`, `FEATURE_SAGEBRUSH_STEPPE`
  - Wet (contextual): `FEATURE_MARSH`, `FEATURE_TUNDRA_BOG`, `FEATURE_MANGROVE`, `FEATURE_OASIS`, `FEATURE_WATERING_HOLE`
  - Aquatic: `FEATURE_REEF`, `FEATURE_COLD_REEF`, `FEATURE_ATOLL`, `FEATURE_LOTUS`
  - Ice: `FEATURE_ICE`
- A dedicated, explicit config/schema surface for owned baseline placement (no overloading of `story.features`) with:
  - mode switch: `"owned" | "vanilla"`
  - per-group enable/multiplier knobs
  - per-feature “chance per eligible plot” overrides
  - explicit placement invariants that are enforced regardless of tuning
- Standard recipe wiring updates so the ecology `features` step can choose owned vs vanilla baseline without changing downstream contracts.
- Map preset updates (all shipped maps under `mods/mod-swooper-maps/src/maps/`) to opt into the owned baseline and tune where theme-appropriate.
- Tests that prove correctness and catch regressions: `canHaveFeature` gating, “never overwrite”, land/water separation, and navigable river exclusions.
- Documentation update that makes the ecology/placement ownership boundary explicit and links to the spike.

## Acceptance Criteria
- With `featuresPlacement.mode = "owned"`:
  - the ecology `features` step never calls `adapter.addFeatures(...)` (test-enforced)
  - the step completes successfully and produces a valid map (no engine crash; no missing required biome invariants such as marine-on-water)
- Every placement:
  - only occurs on plots with `adapter.getFeatureType(x, y) === adapter.NO_FEATURE`
  - is gated by `adapter.canHaveFeature(x, y, featureIdx)` (test-enforced)
- Land features are never placed on:
  - water tiles
  - `TERRAIN_NAVIGABLE_RIVER` tiles
- Aquatic/ice features are never placed on land tiles.
- All shipped map presets set `featuresPlacement.mode = "owned"` and still pass `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm -C mods/mod-swooper-maps test`, `pnpm run deploy:mods`.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm lint`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `pnpm run deploy:mods`
- Manual: generate each shipped map preset in Civ7 and confirm `Scripting.log` has no feature-placement errors (and the resulting map has non-empty, plausible features).

## Dependencies / Notes
- Spike: `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-feature-placement-ownership.md`
- Civ7 base sources (requirements inputs, not to be copied wholesale):
  - `Base/modules/base-standard/maps/feature-biome-generator.js`
  - `Base/modules/base-standard/data/terrain.xml`
- Depends on: `LOCAL-TBD-M7-U08` (marine biome + constants parity; must remain green).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Current state (inventory, concrete delegation)

- Current ecology `features` behavior is “vanilla baseline + mod tweaks”:
  - Stage step: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features.ts`
  - Domain entrypoint: `mods/mod-swooper-maps/src/domain/ecology/features/index.ts`
  - Baseline delegation: `adapter.addFeatures(...)` → `/base-standard/maps/feature-biome-generator.js` `addFeatures(...)`
  - Post-pass tweaks: paradise reefs, shelf reefs, volcanic vegetation, density tweaks (mod-owned).

### Scope boundary (explicit: what this issue owns vs does not own)

#### In scope (M7-U09 owns)

1) **Owned baseline placement** for the exact feature list below (no omissions, no “implicit completeness”):
   - Vegetated: forest/rainforest/taiga/savanna/sagebrush
   - Wet: marsh/tundra bog/mangrove/oasis/watering hole
   - Aquatic: reef/cold reef/atoll/lotus
   - Ice: ice
2) Config + schema + map preset updates required to make owned baseline the default for shipped maps.
3) Tests that prove we respect engine validity and our invariants (so we don’t rediscover crashes later).

#### Explicitly out of scope (must not silently creep in)

- Natural wonders (multi-tile placement; placement-domain owned):
  - `FEATURE_VALLEY_OF_FLOWERS`, `FEATURE_BARRIER_REEF`, `FEATURE_REDWOOD_FOREST`, `FEATURE_GRAND_CANYON`, `FEATURE_GULLFOSS`,
    `FEATURE_HOERIKWAGGO`, `FEATURE_IGUAZU_FALLS`, `FEATURE_KILIMANJARO`, `FEATURE_ZHANGJIAJIE`, `FEATURE_THERA`,
    `FEATURE_TORRES_DEL_PAINE`, `FEATURE_ULURU`, `FEATURE_BERMUDA_TRIANGLE`, `FEATURE_MOUNT_EVEREST`
- Floodplains + floodplain feature types:
  - `FEATURE_*_FLOODPLAIN_*` (placed by `TerrainBuilder.addFloodplains` in placement layer)
- Volcano placement:
  - `FEATURE_VOLCANO` (morphology-owned; do not move into ecology)
- Snow / plot effects:
  - `/base-standard/maps/snow-generator.js` + `MapPlotEffects` (separate issue if we want “snow ownership”)
- Resources / starts / discoveries / advanced start (placement-domain owned).
- Stage-order refactors (ecology vs placement ordering). If we decide ordering is a correctness bug, that is a separate, explicit decision and follow-up issue.

### Civ7 requirements model (hard constraints we must preserve)

This issue is allowed to adopt Civ7’s **requirements model** (constraints and invariants), but must not inherit Civ7’s internal module organization.

#### Sources of truth for constraints

- Civ7 validity and constants live in:
  - `Base/modules/base-standard/data/terrain.xml`
    - `Features` (PlacementClass, PlacementDensity, MinLatitude/MaxLatitude, NoLake, etc.)
    - `Feature_ValidTerrains`, `Feature_ValidBiomes`
    - `TypeTags` (e.g. `IN_LAKE`, `NOTADJACENTTOICE`)
- Civ7 baseline placement behavior we are replacing is in:
  - `Base/modules/base-standard/maps/feature-biome-generator.js`

#### Engine invariants

- `adapter.canHaveFeature(x, y, featureIdx)` is the **required final gate** for all placements. The owned placer must not bypass it.
- The biomes step must have already written valid `field:biomeId`:
  - Water tiles must be `BIOME_MARINE` (see `LOCAL-TBD-M7-U08`), otherwise aquatic feature placement will fail and/or crash downstream.

### Feature inventory (explicit list, with Civ7 placement classes)

These are the Civ7 base-standard features we must be able to place under owned mode (derived from `terrain.xml`):

- Vegetated / `PlacementClass="SCATTER"`
  - `FEATURE_FOREST` (density 50)
  - `FEATURE_RAINFOREST` (density 65)
  - `FEATURE_TAIGA` (density 50)
  - `FEATURE_SAVANNA_WOODLAND` (density 30)
  - `FEATURE_SAGEBRUSH_STEPPE` (density 30)
- Wet / `PlacementClass="NEARRIVER"`
  - `FEATURE_MARSH` (density 30)
  - `FEATURE_TUNDRA_BOG` (density 30)
- Wet / `PlacementClass="COASTAL"`
  - `FEATURE_MANGROVE` (density 30)
- Wet / `PlacementClass="ISOLATED"`
  - `FEATURE_OASIS` (density 50)
  - `FEATURE_WATERING_HOLE` (density 30)
- Aquatic / `PlacementClass="REEF"`
  - `FEATURE_REEF` (density 30, `MaxLatitude=55`)
  - `FEATURE_COLD_REEF` (density 30, `MinLatitude=55`)
- Aquatic / `PlacementClass="OPEN_WATERS"`
  - `FEATURE_ATOLL` (density 12, `MaxLatitude=55`)
- Aquatic / `PlacementClass="IN_LAKE"`
  - `FEATURE_LOTUS` (density 15)
- Ice / `PlacementClass="ICE"`
  - `FEATURE_ICE` (density 90)

Notes:
- Floodplain features exist in the same `Features` table but are intentionally out-of-scope here.
- Volcano exists in the same `Features` table but is morphology-owned.

### Behavioral spec (no black ice: what “owned placement” means)

#### Global invariants (apply to all features)

- Never overwrite: only place on `adapter.getFeatureType(x, y) === adapter.NO_FEATURE`.
- Always validate: only place if `adapter.canHaveFeature(x, y, featureIdx)` returns true.
- Determinism: use `ctxRandom(ctx, ...)` for RNG; never use `Math.random`.
- Performance: must be O(width×height) with small-radius neighborhood checks (radius ≤ 2) only.

#### Plot classification helpers (must be defined explicitly in code)

To avoid hidden semantics, implementation must define these helpers and use them consistently:

- `isNavigableRiverPlot(x, y)`: `adapter.getTerrainType(x, y) === adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER")`
- `isCoastalLand(x, y)`: land tile with at least one adjacent water tile
- `isAdjacentToLand(x, y)`: water tile with at least one adjacent land tile
- `isAdjacentToShallowWater(x, y)`: treat adjacency to `TERRAIN_COAST` as “shallow water adjacency” (used only for optional atoll gating)
- `absLatitude(x, y)`: `Math.abs(adapter.getLatitude(x, y))`

#### Placement groups (baseline policy)

Owned placement should be modular by placement group, but feature targeting must be explicit and configurable.

- Vegetated / SCATTER
  - Eligible: land, NO_FEATURE, not navigable-river plot.
  - Feature choice: choose among the 5 vegetated features using biome/climate signals (implementation detail), but the selection policy must be stable and configurable via per-feature chances and group multipliers.
- Wet / NEARRIVER
  - Eligible: land, NO_FEATURE, not navigable-river plot, `adapter.isAdjacentToRivers(x, y, 2)`.
  - Feature choice: marsh vs tundra bog, guided by biome (preferred) and/or `canHaveFeature` gating.
- Wet / COASTAL
  - Eligible: coastal land, NO_FEATURE, not navigable-river plot.
  - Feature choice: mangrove only.
- Wet / ISOLATED
  - Eligible: land, NO_FEATURE, not navigable-river plot, NOT coastal land, NOT adjacent to rivers at radius 1.
  - Feature choice: oasis vs watering hole.
  - Spacing: must avoid adjacency to the same feature type (at minimum) to prevent dense clumps.
- Aquatic / REEF
  - Eligible: water, NO_FEATURE.
  - Feature choice: reef vs cold reef via abs-latitude split (55° by default).
- Aquatic / OPEN_WATERS
  - Eligible: water, NO_FEATURE.
  - Feature choice: atoll only.
  - Parity option (recommended): implement atoll clustering with a small radius and configurable growth chances (see config spec).
- Aquatic / IN_LAKE
  - Eligible: water, NO_FEATURE.
  - Feature choice: lotus only.
  - Constraint: rely on `canHaveFeature` (and engine tags) to enforce “in lake” semantics; do not implement lake topology analysis as part of this issue.
- Ice
  - Eligible: water, NO_FEATURE, abs-latitude ≥ threshold (78° default), and not adjacent to land.
  - Optional additional exclusion: avoid adjacency to natural wonders (explicitly configurable).

### Config & schema spec (must be implementable + must update map presets)

This issue must add a dedicated config block; do not overload narrative `FeaturesConfigSchema`.

#### New config block

- Add to `MapGenConfig`:
  - `featuresPlacement?: FeaturesPlacementConfig`
- Add to config schemas:
  - `mods/mod-swooper-maps/src/config/schema/ecology.ts`: `FeaturesPlacementConfigSchema`
  - `mods/mod-swooper-maps/src/config/schema.ts`: wire `featuresPlacement` into `MapGenConfigSchema`
- Thread into recipe config:
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`: pass `overrides.featuresPlacement` into the ecology `features` step config
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features.ts`: accept + validate config and pass into domain entrypoint

#### Proposed config shape (fully specified)

This is a “requirements” spec for config semantics; exact naming can vary slightly, but all fields must exist with these meanings:

```
featuresPlacement: {
  mode: "owned" | "vanilla", // default "owned" for shipped maps

  groups: {
    vegetated: { enabled: true, multiplier: 1 },
    wet:       { enabled: true, multiplier: 1 },
    aquatic:   { enabled: true, multiplier: 1 },
    ice:       { enabled: true, multiplier: 1 },
  },

  chances: {
    // chance per eligible plot (0..100)
    // defaults must match Civ7 PlacementDensity values from terrain.xml
    FEATURE_FOREST: 50,
    FEATURE_RAINFOREST: 65,
    FEATURE_TAIGA: 50,
    FEATURE_SAVANNA_WOODLAND: 30,
    FEATURE_SAGEBRUSH_STEPPE: 30,
    FEATURE_MARSH: 30,
    FEATURE_TUNDRA_BOG: 30,
    FEATURE_MANGROVE: 30,
    FEATURE_OASIS: 50,
    FEATURE_WATERING_HOLE: 30,
    FEATURE_REEF: 30,
    FEATURE_COLD_REEF: 30,
    FEATURE_ATOLL: 12,
    FEATURE_LOTUS: 15,
    FEATURE_ICE: 90,
  },

  aquatic: {
    reefLatitudeSplit: 55,
    atoll: {
      enableClustering: true,
      clusterRadius: 1,
      shallowWaterAdjacencyGateChance: 30,
      growthChanceEquatorial: 15,
      growthChanceNonEquatorial: 5,
    },
  },

  ice: {
    minAbsLatitude: 78,
    forbidAdjacentToLand: true,
    forbidAdjacentToNaturalWonders: true,
  },
}
```

Hard requirements for config behavior:
- Unknown feature keys in `featuresPlacement.chances` must not silently no-op:
  - either fail fast (preferred) or log a loud warning and skip; behavior must be explicit and test-covered.
- When `mode = "owned"`, vanilla baseline must not run (test-enforced via `MockAdapter.calls.addFeatures`).

### Map preset updates (required; this issue is not “done” without them)

Update every shipped map preset in `mods/mod-swooper-maps/src/maps/`:

- `gate-a-continents.ts`
- `shattered-ring.ts`
- `sundered-archipelago.ts`
- `swooper-desert-mountains.ts`
- `swooper-earthlike.ts`

Minimum required changes per map:
- add a `featuresPlacement` block
- set `featuresPlacement.mode = "owned"`
- keep existing `featuresDensity` and story feature-tunables (post-pass tweaks) unless a map’s theme requires adjustment

Contextual tuning requirements (high-level, no black ice):
- Archipelago-style maps must bias `aquatic.multiplier` upward and/or increase reef/atoll chances.
- Desert-heavy maps must bias `wet.multiplier` downward and keep oasis/watering-hole chances explicit.
- Earthlike maps should keep Civ7-like defaults unless we have a specific reason to diverge.

### Tests (hard requirements)

Add new tests under `mods/mod-swooper-maps/test/ecology/`:

1) `features-owned-does-not-call-vanilla.test.ts`
   - `featuresPlacement.mode = "owned"` ⇒ `adapter.calls.addFeatures.length === 0`
2) `features-owned-never-overwrites.test.ts`
   - pre-seed a feature on a plot and prove it never changes
3) `features-owned-land-water-separation.test.ts`
   - ensure land features never appear on water and aquatic/ice never appear on land
4) `features-owned-navigable-river-exclusion.test.ts`
   - set `TERRAIN_NAVIGABLE_RIVER` on a plot and prove no land feature is placed there
5) `features-owned-enforces-canHaveFeature.test.ts`
   - stub `adapter.canHaveFeature` to reject one feature and prove it is never placed even if chance would otherwise pass
6) `features-owned-reef-latitude-split.test.ts`
   - verify reef vs cold reef selection honors the configured split (or fails safe via `canHaveFeature` gating)

If `MockAdapter.canHaveFeature` remains “always true”, add a test-only injection hook to `createMockAdapter` (preferred) so tests can assert gating behavior without global mutation.

### Concrete code changes (file-level plan)

Expected patch footprint:

- Domain implementation (new):
  - `mods/mod-swooper-maps/src/domain/ecology/features/owned/**` (placement group rules + helpers)
  - `mods/mod-swooper-maps/src/domain/ecology/features/owned/types.ts` (feature placement config types)
- Domain orchestration (update):
  - `mods/mod-swooper-maps/src/domain/ecology/features/index.ts`:
    - chooses baseline (`owned` vs `vanilla`)
    - runs existing narrative tweaks after baseline (paradise reefs, shelf reefs, volcanic vegetation, density tweaks)
- Step wiring (update):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features.ts` (schema + pass config through)
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (thread `featuresPlacement` overrides into the step config)
- Config schema/types (update):
  - `mods/mod-swooper-maps/src/config/schema/ecology.ts` (add `FeaturesPlacementConfigSchema`)
  - `mods/mod-swooper-maps/src/config/schema.ts` (add `featuresPlacement` to `MapGenConfigSchema`)
  - `mods/mod-swooper-maps/src/config/index.ts` (re-export schema/type)
- Map presets (update):
  - add `featuresPlacement` blocks to each shipped map
- Tests (new):
  - add new `mods/mod-swooper-maps/test/ecology/*.test.ts`

### Rollout sequencing (explicit, but outcome is full ownership)

Implementation order (recommended):
1) Add config/schema plumbing + owned/vanilla switch + tests that prove vanilla is not called.
2) Implement aquatic + ice rules.
3) Implement vegetated scatter rules.
4) Implement wet rules (near-river/coastal/isolated).
5) Update all shipped map presets to enable owned mode and tune multipliers.
6) Run full verification + in-game smoke generation for each map preset.

## Implementation Decisions

### Introduce a dedicated `featuresPlacement` config block
- **Context:** Baseline placement ownership needs broad, ecology-owned knobs. Current `FeaturesConfigSchema` is explicitly “localized story bonuses” and should not be overloaded.
- **Options:** Extend `story.features`; overload `featuresDensity`; add a dedicated `featuresPlacement` block.
- **Choice:** Add a dedicated `featuresPlacement` config block and thread it explicitly into the ecology `features` step.
- **Rationale:** Keeps semantics stable and makes map preset adoption explicit (no hidden defaults).
- **Risk:** Requires schema + preset updates across all shipped maps (intended for this slice).

### Defer floodplains “full ownership” until a river topology contract exists
- **Context:** Floodplains are placed via `TerrainBuilder.addFloodplains(...)` and are deeply tied to river semantics; user explicitly flagged “skip if it requires modeling rivers”.
- **Options:** Keep calling engine `addFloodplains`; reimplement floodplains placement fully; define a hybrid contract (mod chooses parameters/candidates, engine applies).
- **Choice:** Defer full floodplains ownership; keep engine call in placement for now and revisit once we define a minimal river adjacency/topology contract.
- **Rationale:** Avoid crossing into hydrology while still keeping correctness and compatibility.
- **Risk:** Some “environment look” remains engine-controlled until a follow-up issue lands.

