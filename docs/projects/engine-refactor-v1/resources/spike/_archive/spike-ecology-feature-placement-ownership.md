# Spike: Ecology Feature Placement Ownership (Inventory + Target Plan)

## Context / Why this spike exists

We currently “own” **biome classification** (and biome application), but we still delegate most **feature/vegetation placement** to Civ7’s base scripts via the adapter. That delegation is intentional for compatibility, but it also means:

- Our ecology domain is not the source of truth for *where* most vegetation / aquatic features / ice end up.
- Any refactor that removes or reorders base passes can silently drop implicit game requirements (e.g. `BIOME_MARINE` on water tiles).
- “Config ownership” is limited because most knobs live inside Civ7 base scripts/data, not our own config surface.

This spike documents:
- what we currently own vs delegate,
- what Civ7 base logic/data implies as **requirements** (not “their whole model”),
- and a concrete, phased plan to move feature placement under ecology ownership without stepping into non-ecology domains.

## Current ownership vs delegation (as of `mods/mod-swooper-maps`)

### We own

- **Biome classification + reification**
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/**`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/**`
  - Outcome: publishes/sets `field:biomeId` and ensures `BIOME_MARINE` on water tiles (engine requirement).

- **Small post-pass feature tweaks (on top of vanilla)**
  - `mods/mod-swooper-maps/src/domain/ecology/features/**`
  - Outcome: conservative, validated adjustments (e.g. extra reefs near paradise hotspots), but *not the baseline placement*.

### We still delegate (thin wrapper calls into base scripts / engine)

- **Baseline features/vegetation/aquatic/ice**
  - `mods/mod-swooper-maps/src/domain/ecology/features/index.ts` → `adapter.addFeatures(...)`
  - Adapter wraps: `Base/modules/base-standard/maps/feature-biome-generator.js` → `addFeatures(...)`

- **Placement phase (not ecology, but relevant to “environment look”)**
  - `mods/mod-swooper-maps/src/domain/placement/index.ts` delegates to engine/base via adapter:
    - natural wonders (`/base-standard/maps/natural-wonder-generator.js`)
    - floodplains (`TerrainBuilder.addFloodplains(...)`)
    - snow plot effects (`/base-standard/maps/snow-generator.js`)
    - resources (`/base-standard/maps/resource-generator.js`)
    - starts/sectors (`/base-standard/maps/assign-starting-plots.js`)
    - discoveries (`/base-standard/maps/discovery-generator.js`)
    - advanced start regions (`/base-standard/maps/assign-advanced-start-region.js`)
    - plus terrain validation/areas/water data and fertility recalc (engine functions)

## Civ7 “requirements model” for features (what we must preserve)

Goal: identify constraints that must hold for correctness and engine stability, without copying Civ7’s internal organization.

### 1) Engine-required invariants / sequencing

From Civ7 base order (documented in our `runPlacement` wrapper) and base scripts:

- Biomes must be set **before** feature placement in order to keep later systems stable.
  - Base script explicitly assigns `BIOME_MARINE` on all water plots in `designateBiomes(...)`.
  - Our ecology pipeline must keep that invariant even if we stop calling vanilla `designateBiomes`.
- Feature placement must respect engine validation surfaces:
  - `TerrainBuilder.canHaveFeature(x, y, featureIdx)` is treated as the canonical “allowed placement” gate.
  - `FeatureTypes.NO_FEATURE` is the sentinel check for “empty plot”.

### 2) Data-driven constraints (source of truth: `terrain.xml`)

The base “terrain + biomes + features” tables are defined in:
- `Base/modules/base-standard/data/terrain.xml`

Key fields that should be treated as *requirements inputs* for a replacement placer:

- `Features.PlacementClass` (observed values in base data / scripts):
  - `SCATTER`, `ISOLATED`, `NEARRIVER`, `COASTAL`, `REEF`, `ICE`, `RIVERMOUTH` (floodplains)
  - (Base script also checks `IN_LAKE`, `OPEN_WATERS`, though these may be used by non-standard content.)
- `Features.PlacementDensity` (probability threshold used by vanilla; see `AddFeature(...)`)
- `Features.MinLatitude` / `MaxLatitude` (used for aquatic features selection and ice behavior)
- `Features.NoLake` (aquatic features should avoid lakes)
- Feature classes: `FEATURE_CLASS_AQUATIC`, `FEATURE_CLASS_VEGETATED`, `FEATURE_CLASS_WET`, `FEATURE_CLASS_FLOODPLAIN`

### 3) Script-level constraints (base algorithms)

The baseline algorithm for features is in:
- `Base/modules/base-standard/maps/feature-biome-generator.js`

Observed placement requirements we must preserve (even if the algorithm differs):

- Land features should not be placed:
  - on water plots
  - on plots with an existing feature
  - on navigable rivers (`GameplayMap.isNavigableRiver(...) == false`)
- “PlacementClass” is a hard filter:
  - vanilla uses `canAddFeature(...)` to check `PlacementClass` and then `TerrainBuilder.canHaveFeature(...)`
- Aquatic features:
  - selected with latitude gating using `GameInfo.Features[featIdx].MinLatitude/MaxLatitude`
  - have extra logic for atoll clustering and “shallow water adjacency” chance
- Ice:
  - placed only above a high latitude threshold (vanilla: > 78 abs latitude)
  - avoids adjacency to land and natural wonders
  - uses `PlacementDensity` as a tunable threshold (but with an extra “latitude bias”)

## What “full ecology ownership” should mean (scope boundaries)

### In-scope for ecology ownership

- Baseline placement of **non-wonder features**:
  - vegetated (forest/rainforest/taiga/savanna/sagebrush)
  - wet/isolate (marsh/mangrove/oasis/watering hole/tundra bog)
  - aquatic (reef/cold reef/atoll/lotus)
  - ice (feature ice)
- Configuration surface for densities and placement policy overrides (while keeping engine constraints).

### Out-of-scope (engine / other domain boundaries)

- **Natural wonders** (placement domain; also tightly tied to engine scoring and special rules).
- **Resources / starts / discoveries / advanced start** (placement domain).
- **Terrain generation / rivers / coastlines / elevation** (morphology/hydrology/foundation).
- **Floodplains** are ambiguous:
  - Implementing floodplains “fully” likely requires river topology semantics (hydrology-adjacent) or leaning on `TerrainBuilder.addFloodplains`.
  - We can treat floodplains as a follow-up phase once we define what “ownership” means without reimplementing rivers.

## Proposed target architecture (requirements-driven, not a Civ7 clone)

Core idea:

1) Derive **feature intents** (candidate placements) from our own climate/biome fields + narrative motifs + geometry.
2) Apply intents through the adapter with a single, explicit validation gate:
   - `adapter.canHaveFeature(...)` must be true at the final point of placement.

This keeps us aligned with Civ7 constraints while letting mod authors tweak strategy/rules without taking on Civ7’s entire placement stack.

### Suggested file structure (illustrative)

One possible expansion (keep naming consistent with existing `ops/**` and `features/**` patterns):

```
mods/mod-swooper-maps/src/domain/ecology/
  feature-placement/
    index.ts                      # entrypoint: placeFeatures(...)
    types.ts                      # config + public types
    engine-data/
      feature-defs.ts             # reads adapter GameInfo via indices + metadata normalization
      placement-classes.ts        # PlacementClass enums/helpers
    rules/
      candidates/
        coastal.ts                # compute candidate set for COASTAL
        near-river.ts             # compute candidate set for NEARRIVER (adjacent-to-river)
        scatter.ts                # SCATTER candidates and spacing policy
        aquatic.ts                # water candidates + latitude filters
        ice.ts                    # polar candidates + exclusions
      validators/
        can-have-feature.ts       # adapter.canHaveFeature gate + common exclusions
        spacing.ts                # adjacency/spacing policy (mod-owned)
      samplers/
        weighted.ts               # data-driven weighted choice helpers
    apply/
      apply-intents.ts            # writes via adapter.setFeatureType
      stats.ts                    # counts-by-feature/biome for logs + tests
```

In the stage/recipe layer:

```
mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/
  biomes/...
  features/
    index.ts                      # stage step
    helpers/
      config.ts                   # merge config + defaults
      apply.ts                    # call domain entrypoint(s)
```

## Migration plan (phased to reduce risk)

### Phase 0 — Instrumentation and parity harness
- Add debug-only logging helpers (counts by feature class / placement class / biome).
- Optionally keep a “dual-run” mode locally:
  - run vanilla `adapter.addFeatures` into a scratch copy (or record-only) and compare distributions.
  - avoid shipping dual-run to production; use it as a development harness.

### Phase 1 — Replace aquatic + ice (lowest coupling, most obvious requirements)
- Implement ecology-owned placement for:
  - reefs/cold reefs
  - atoll + lotus (including any required clustering rules)
  - feature ice (respect high-latitude + adjacency exclusions)
- Keep vegetated + wet features delegated for now.

### Phase 2 — Replace vegetated scatter features
- Implement placement for:
  - forest / rainforest / taiga / savanna woodland / sagebrush steppe
- Use our existing climate/biome outputs to drive density policy, but still gate with `canHaveFeature`.

### Phase 3 — Replace wet/isolate features
- Implement placement for:
  - marsh / mangrove / oasis / watering hole / tundra bog
- Model minimal river adjacency semantics using adapter reads:
  - `adapter.isAdjacentToRivers(x, y, radius)` (already available)
  - do not attempt to model river graphs.

### Phase 4 — Turn off vanilla `addFeatures` by default
- Keep an escape hatch (config flag) to fall back to vanilla placement for debugging/regressions.
- Add regression tests to lock invariants (see below).

## Testing strategy (what “done” should prove)

Use `MockAdapter`-style tests where possible; keep engine-only validation as smoke tests.

- Unit tests (mod-owned logic):
  - placement class candidate generation
  - latitude gating for aquatic features
  - spacing / adjacency rules
  - “never place on water” / “never place on navigable river” invariants for land features
- Integration-ish tests (mock adapter grid):
  - applying intents calls `setFeatureType` only when `canHaveFeature` is true
  - stable seed behavior (same seed → same placements) for a small fixed grid

## Open questions / risks to resolve before implementation

- Floodplains ownership: do we defer entirely, or define “ownership” as “choose parameters + call `TerrainBuilder.addFloodplains`”?
- Engine validation coverage: `TerrainBuilder.canHaveFeature` is necessary but may not be sufficient for “good gameplay”; do we also need spacing/pattern rules for balance?
- Performance: naive per-tile scans over *all* features are expensive; we should pre-bucket features by `PlacementClass` and only evaluate relevant ones.

