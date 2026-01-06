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
  - strategy switch: `"owned" | "vanilla"` (strategy selection shape)
  - per-group multipliers only (no per-group enable/disable)
  - per-feature “chance per eligible plot” overrides
  - explicit placement invariants that are enforced regardless of tuning
- Modularize the ecology features pipeline per the operation-module spec:
  - domain op module with strategies + rules for baseline placement
  - step-local inputs/apply helpers for runtime integration
- Standard recipe wiring updates so the ecology `features` step can choose owned vs vanilla baseline without changing downstream contracts.
- Map preset updates (all shipped maps under `mods/mod-swooper-maps/src/maps/`) to opt into the owned baseline and tune where theme-appropriate, with all feature/ecology placement config fields explicitly defined (no defaults, including climate baseline/swatch knobs).
- Tests that prove correctness and catch regressions: `canHaveFeature` gating, “never overwrite”, land/water separation, and navigable river exclusions.
- Documentation update that makes the ecology/placement ownership boundary explicit and links to the spike.
- Climate swatches are disabled without deleting code (confirm omission is insufficient; implement minimal config/code gate to suppress them while isolating ecology work).
- Biome schemas/configs updated with TypeBox descriptions **and** JSDoc comments that explain intent, tuning impact, units, and expected ranges for non-expert configuration.
- Fix latitude band cutoffs and/or swatch dominance so biome/feature distribution blends naturally (no harsh band edges).
- All tunable parameters and multipliers in feature/ecology rules are surfaced in config schemas (no hidden tuning constants).
- Owned plot-effect placement for climate/ecology outputs:
  - Snow (light/medium/heavy permanent) driven by temperature + elevation + moisture (no `adapter.generateSnow` call).
  - Sand/burned plot effects as explicit, config-driven ecology outputs (where relevant to climate realism).
- Climate realism pass upgrades:
  - explicit rainfall seed/blend semantics (band targets are a bias, not the only signal).
  - explicit aridity/freeze-index fields that feed biomes and features.
- Full cutover: no in-logic dual paths; any compatibility shims must live at boundaries and be documented in Implementation Decisions.
- Remove `gate-a-continents.ts` map entry (now obsolete).

## Acceptance Criteria
- With `featuresPlacement.strategy = "owned"`:
  - the ecology `features` step never calls `adapter.addFeatures(...)` (test-enforced)
  - the step completes successfully and produces a valid map (no engine crash; no missing required biome invariants such as marine-on-water)
- The placement stage never calls `adapter.generateSnow(...)`; owned snow plot effects are applied instead (test-enforced).
- Plot-effect placement (snow/sand/burned) is fully driven by ecology/climate config (no hidden constants).
- Every placement:
  - only occurs on plots with `adapter.getFeatureType(x, y) === adapter.NO_FEATURE`
  - is gated by `adapter.canHaveFeature(x, y, featureIdx)` (test-enforced)
- Land features are never placed on:
  - water tiles
  - `TERRAIN_NAVIGABLE_RIVER` tiles
- Aquatic/ice features are never placed on land tiles.
- All shipped map presets set `featuresPlacement.strategy = "owned"` and still pass `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm -C mods/mod-swooper-maps test`, `pnpm run deploy:mods`.
- Climate swatches do not render/execute when explicitly disabled, without removing their implementation.
- All shipped map presets explicitly set every feature/ecology placement config value (no reliance on defaults in map files).
- Feature placement config has no per-group enable/disable (owned strategy activates all groups).
- Feature/ecology rules expose all tunables in config schemas (no hidden constants).
- Baseline latitude bands blend without visible hard cutoffs (verify in at least one earthlike and one extreme-biome map).
- Aridity/freeze-index fields are computed and used by biome + feature placement (no ad-hoc recomputations inside rules).

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
- Spike (realism pass): `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-climate-realism-pass.md`
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

- Ecology `features` is now an op-backed orchestration step:
  - Stage step: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`
  - Baseline op: `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/` (strategy wrapper: owned vs vanilla)
  - Embellishment op: `mods/mod-swooper-maps/src/domain/ops/ecology/features-embellishments/`
  - Engine baseline is only invoked when `featuresPlacement.strategy = "vanilla"`; owned baseline plans placements and the step applies them.

### Modularization requirements (SPEC pending)

- Convert features placement into an ecology op module with strategies + rules, mirroring the volcano example.
- Move step orchestration into a foldered step with explicit `inputs` + `apply` helpers.
- Steps must consume op configs directly (no re-authored wrappers) and pass strategy configs through.
- Rules must be pure and parameterized by config (no hidden constants).
- If any ecology placement rule still embeds tunables, lift them into config + schema as part of this work (no “hidden” multipliers).

### Scope boundary (explicit: what this issue owns vs does not own)

#### In scope (M7-U09 owns)

1) **Owned baseline placement** for the exact feature list below (no omissions, no “implicit completeness”):
   - Vegetated: forest/rainforest/taiga/savanna/sagebrush
   - Wet: marsh/tundra bog/mangrove/oasis/watering hole
   - Aquatic: reef/cold reef/atoll/lotus
   - Ice: ice
2) Config + schema + map preset updates required to make owned baseline the default for shipped maps.
3) Tests that prove we respect engine validity and our invariants (so we don’t rediscover crashes later).
4) Owned plot effects for snow/sand/burned driven by ecology/climate fields.
5) Climate realism upgrades (explicit rainfall seed/blend, aridity + freeze index fields).
6) Remove the obsolete `gate-a-continents.ts` entry map.

#### Explicitly out of scope (must not silently creep in)

- Natural wonders (multi-tile placement; placement-domain owned):
  - `FEATURE_VALLEY_OF_FLOWERS`, `FEATURE_BARRIER_REEF`, `FEATURE_REDWOOD_FOREST`, `FEATURE_GRAND_CANYON`, `FEATURE_GULLFOSS`,
    `FEATURE_HOERIKWAGGO`, `FEATURE_IGUAZU_FALLS`, `FEATURE_KILIMANJARO`, `FEATURE_ZHANGJIAJIE`, `FEATURE_THERA`,
    `FEATURE_TORRES_DEL_PAINE`, `FEATURE_ULURU`, `FEATURE_BERMUDA_TRIANGLE`, `FEATURE_MOUNT_EVEREST`
- Floodplains + floodplain feature types:
  - `FEATURE_*_FLOODPLAIN_*` (placed by `TerrainBuilder.addFloodplains` in placement layer)
- Volcano placement:
  - `FEATURE_VOLCANO` (morphology-owned; do not move into ecology)
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
  - Feature choice: choose among the 5 vegetated features using biome/climate signals (implementation detail), but the selection policy must be stable and configurable via per-feature chances, group multipliers, and explicit biome/threshold tunables.
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

#### No hidden tunables

Any multiplier, threshold, radius, or scalar used by feature/ecology rules must be surfaced in config (op schema + step schema + map preset).

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
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`: accept + validate config and pass into domain entrypoint

#### Proposed config shape (fully specified)

This is a “requirements” spec for config semantics; exact naming can vary slightly, but all fields must exist with these meanings:

```
featuresPlacement: {
  strategy: "owned" | "vanilla",
  config: {

    groups: {
      vegetated: { multiplier: 1 },
      wet:       { multiplier: 1 },
      aquatic:   { multiplier: 1 },
      ice:       { multiplier: 1 },
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

    vegetated: {
      minVegetation: 0.05,
      vegetationChanceScalar: 1,
      desertSagebrushMinVegetation: 0.2,
      tundraTaigaMinVegetation: 0.25,
      tundraTaigaMinTemperature: -2,
      temperateDryForestMoisture: 120,
      temperateDryForestVegetation: 0.45,
      tropicalSeasonalRainforestMoisture: 140,
    },

    wet: {
      nearRiverRadius: 2,
      coldTemperatureMax: 2,
      coldBiomeSymbols: ["snow", "tundra", "boreal"],
      mangroveWarmTemperatureMin: 18,
      mangroveWarmBiomeSymbols: ["tropicalRainforest", "tropicalSeasonal"],
      coastalAdjacencyRadius: 1,
      isolatedRiverRadius: 1,
      isolatedSpacingRadius: 1,
      oasisBiomeSymbols: ["desert", "temperateDry"],
    },

    aquatic: {
      reefLatitudeSplit: 55,
      atoll: {
        enableClustering: true,
        clusterRadius: 1,
        equatorialBandMaxAbsLatitude: 23,
        shallowWaterAdjacencyGateChance: 30,
        shallowWaterAdjacencyRadius: 1,
        growthChanceEquatorial: 15,
        growthChanceNonEquatorial: 5,
      },
    },

    ice: {
      minAbsLatitude: 78,
      forbidAdjacentToLand: true,
      landAdjacencyRadius: 1,
      forbidAdjacentToNaturalWonders: true,
      naturalWonderAdjacencyRadius: 1,
    },
  }
}
```

Hard requirements for config behavior:
- Unknown feature keys in `featuresPlacement.chances` must not silently no-op:
  - either fail fast (preferred) or log a loud warning and skip; behavior must be explicit and test-covered.
- Strategy config shape must be used even if only one strategy is implemented (proto strategy wrapper).
- Per-group enable/disable toggles are not allowed (owned strategy always activates all groups).
- All tunable constants in feature/ecology rules must be surfaced in config/schema.
- When `strategy = "owned"`, vanilla baseline must not run (test-enforced via `MockAdapter.calls.addFeatures`).

### Climate baseline smoothing (lat-band blending)

Baseline rainfall bands must blend smoothly rather than hard-cut at latitude boundaries.

Required config updates:
- Add explicit band edges (degrees) and transition width to `ClimateBaselineBandsSchema`.
- Add size-scaling knobs for equatorial boost and noise scaling (base area, min/max scale, equator boost scale).
- Map presets must explicitly set the new band edges + transition width, and explicitly set `climate.swatches.enabled = false`.

Implementation requirements:
- Use linear or smoothstep blending across band boundaries using the transition width.
- Avoid hard step changes at latitude cutoffs; verify by comparing at least one earthlike and one extreme-biome map.

### Map preset updates (required; this issue is not “done” without them)

Update every shipped map preset in `mods/mod-swooper-maps/src/maps/`:

- `gate-a-continents.ts`
- `shattered-ring.ts`
- `sundered-archipelago.ts`
- `swooper-desert-mountains.ts`
- `swooper-earthlike.ts`

Minimum required changes per map:
- add a `featuresPlacement` block with full strategy config shape
- set `featuresPlacement.strategy = "owned"`
- explicitly set **all** feature placement + ecology placement config fields (no defaults)
  - includes features placement, biome/ecology placement, and climate baseline/swatches knobs

Contextual tuning requirements (high-level, no black ice):
- Archipelago-style maps must bias `aquatic.multiplier` upward and/or increase reef/atoll chances.
- Desert-heavy maps must bias `wet.multiplier` downward and keep oasis/watering-hole chances explicit.
- Earthlike maps should keep Civ7-like defaults unless we have a specific reason to diverge.

### Tests (hard requirements)

Add new tests under `mods/mod-swooper-maps/test/ecology/`:

1) `features-owned-does-not-call-vanilla.test.ts`
   - `featuresPlacement.strategy = "owned"` ⇒ `adapter.calls.addFeatures.length === 0`
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

- Domain implementation (new/refactor):
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/**` (op module, strategies, rules, schemas)
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/strategies/*.ts` (owned vs vanilla/engine)
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/rules/**` (pure placement helpers)
- Domain orchestration (update):
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/**` (owned/vanilla strategies + rules)
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-embellishments/**` (post-pass tweaks as an op)
  - `mods/mod-swooper-maps/src/domain/ops/ecology/index.ts` (export new ops)
- Step wiring (update to foldered step):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts`
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

### Realism pass extension (new scope for this follow-on)

This pass expands ecology/climate ownership to remove latitude dominance and add owned plot effects.

- Adapter boundary: add PlotEffects APIs (add/has/query-by-tags) to `@civ7/adapter` + mock.
- Climate baseline: explicit seed + blend semantics; bands become bias, not the only signal.
- New climate/ecology fields: aridity + freeze-index (first-class artifacts with schema).
- Plot-effects ops: owned snow + sand + burned with full config and strategy modules.
- Feature placement: replace hard exclusions with climate envelopes; hoist all thresholds into config.
- Map presets: set all new config fields explicitly; delete `gate-a-continents.ts`.

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

### Disable climate swatches via an explicit `enabled` gate
- **Context:** `climate.swatches` defaults to `{}` via schema, so omission still runs a macro swatch; the issue requires swatches off to isolate ecology changes.
- **Options:** Remove the storySwatches stage; change defaults to `undefined`; add an `enabled` gate in `applyClimateSwatches` and set it false in standard-config.
- **Choice:** Short‑circuit the `storySwatches` step when `swatches.enabled === false` (or swatches missing), and default `enabled: false` in standard recipe config. `applyClimateSwatches` remains guarded as a secondary safety net.
- **Rationale:** Minimal, reversible change that prevents swatches from mutating rainfall while keeping the pipeline intact.
- **Risk:** Swatches remain off until explicitly re-enabled in a preset.

### Order owned feature placement by stability priority
- **Context:** The spec does not define ordering between ice, aquatic, wetland, and vegetated passes.
- **Options:** Vegetated-first; wetland-first; aquatic-first; ice-first with aquatic/land after.
- **Choice:** Place ice first, then aquatic features, then wetland features, and finally vegetated scatter.
- **Rationale:** Ensures polar ice wins ties, wetlands reserve near-river/coastal niches, and scatter fills remaining land.
- **Risk:** Feature mix may differ from vanilla and require tuning.

### Map biome symbols to vegetated feature types using moisture heuristics
- **Context:** Owned scatter needs a stable selection policy; the spec leaves the mapping open.
- **Options:** Random weighted across all vegetated features; strict biome→feature mapping; heuristic mapping using moisture/vegetation density.
- **Choice:** Use biome-symbol mapping with moisture/vegetation thresholds to decide forest vs sagebrush and rainforest vs savanna.
- **Rationale:** Keeps results predictable while still responding to climate signals.
- **Risk:** Thresholds may bias feature mixes in edge climates.

### Define equatorial band for atoll growth and shallow-water gating
- **Context:** Atoll growth config includes equatorial vs non-equatorial chances but no latitude boundary or gate semantics.
- **Options:** Use tropics (~23°); reuse reef latitude split; add new config field.
- **Choice:** Use a 23° equatorial band and apply the shallow-water gate only when adjacent to shallow water.
- **Rationale:** Aligns with real-world tropics and keeps gating localized to coasts.
- **Risk:** Atoll distribution might skew until tuning passes adjust the band or chances.

### Split feature ownership into baseline placement + embellishment ops
- **Context:** The spec calls for operation modules with strategies and pure rules; current `addDiverseFeatures` mixes baseline placement with post-pass narrative tweaks.
- **Options:** Keep a single monolithic domain function; split into separate ops for baseline and embellishments; push embellishments into step-only logic.
- **Choice:** Create a baseline placement op (with strategies) and a separate embellishments op; step orchestrates both.
- **Rationale:** Aligns with the op-module spec while keeping embellishment tuning colocated with domain logic.
- **Risk:** More wiring/config surface; requires map/config updates for new op shapes.

### Model baseline placement as a strategy selection wrapper
- **Context:** The spec requires a strategy shape even before multiple strategies are fully implemented.
- **Options:** Keep a `mode` string; use `{ strategy, config }` wrapper; add separate `featuresPlacement` and `featuresPlacementStrategy` fields.
- **Choice:** Use `{ strategy, config }` with literal strategies (`owned` | `vanilla`) and strategy-specific configs.
- **Rationale:** Makes the intended strategy abstraction explicit and keeps op contracts stable.
- **Risk:** Requires broader config/schema updates and explicit map overrides.

### Hoist biome vegetation adjustments into explicit per-symbol modifiers
- **Context:** Vegetation density rules embed per-biome multipliers/bonuses and moisture normalization padding constants.
- **Options:** Leave constants in rules; expose a few top-level scalars; define per-biome modifiers/bonuses in config.
- **Choice:** Add per-biome multiplier/bonus settings plus moisture normalization padding to the biome config schema.
- **Rationale:** Exposes all tuning knobs without hardcoding biome behavior in rules.
- **Risk:** Adds verbose config requirements for every map preset.

### Blend climate baseline bands with smooth transitions
- **Context:** Hard latitude cutoffs cause visible banding; spec requires smooth blending.
- **Options:** Linear blend; smoothstep blend; noise-based blending.
- **Choice:** Use smoothstep blending across explicit band edges with a configurable transition width.
- **Rationale:** Smoothstep avoids visible seams while preserving band intent.
- **Risk:** Requires map retuning of band values due to blended overlaps.

### Move plot-effect placement (snow/sand/burned) into ecology stage
- **Context:** Owned plot effects need access to climate/ecology fields; placement stage currently only has adapter and does not expose those fields.
- **Options:** Keep plot effects in placement and thread artifacts through `runPlacement`; move plot effects into a dedicated ecology op/step; create a hybrid “compute in ecology, apply in placement” artifact.
- **Choice:** Add a dedicated ecology op + step that computes and applies plot effects, and remove the placement-stage snow call.
- **Rationale:** Keeps plot effects with the climate/ecology field pipeline, avoids widening the placement API, and supports full ownership without hidden fallbacks.
- **Risk:** Slight ordering shift relative to vanilla (snow now happens before placement passes); may require tuning if any downstream systems assume snow occurs later.

### Resolve plot-effect types by tags with explicit type-name fallback
- **Context:** Snow plot effects are discoverable via tags; sand/burned may not have tags in base data.
- **Options:** Hardcode plot-effect IDs; resolve by tags only; resolve by tags with a type-name fallback.
- **Choice:** Resolve by tags first, then fall back to explicit plot-effect type names.
- **Rationale:** Keeps configs readable while ensuring sand/burned can still resolve even if tag metadata is missing.
- **Risk:** If engine type names change, sand/burned placement will silently drop; mitigated by explicit config and tests.

### Use per-biome vegetation thresholds with aridity/freeze gating for scatter features
- **Context:** A single global vegetation threshold made deserts/tundra almost barren and over-coupled to latitude bands.
- **Options:** Keep a global threshold; add per-biome thresholds; add aridity/freeze gating to the biome-based selector.
- **Choice:** Introduce per-biome minimum vegetation thresholds and aridity/freeze gates for desert/tundra/temperate-dry selectors.
- **Rationale:** Allows sparse vegetation in harsh biomes while keeping hot/dry or frozen extremes appropriately barren.
- **Risk:** Requires map-level tuning for consistent biome look and feature mix.

### Blend rainfall bands with a seed baseline in presets
- **Context:** Pure band-driven rainfall can produce sharp latitudinal seams and dominate climate fields.
- **Options:** Keep band-only weights; bias toward seed rainfall; fully replace bands with seed.
- **Choice:** Use non-zero seed/base weight in map presets alongside band weights.
- **Rationale:** Adds coastal + distance-to-water structure and softens band cutoffs without dropping band intent.
- **Risk:** Presets require rebalancing band values to hit target humidity levels.

### Keep ecology feature ownership tests split by behavior
- **Context:** Feature ownership tests are spread across multiple files; user asked whether to consolidate.
- **Options:** Merge into a single monolithic spec file; keep focused tests per behavior.
- **Choice:** Keep focused test files for each behavior (ownership, adjacency, exclusions).
- **Rationale:** Isolates failures to specific behaviors and matches existing test patterns in the mod package.
- **Risk:** Slightly more files to navigate, but failures stay more diagnosable.

### Normalize snow elevation by land percentiles (absolute strategy retained)
- **Context:** Snow placement used absolute elevation thresholds; map heightfields often peak far below the configured max, so the elevation factor never saturated and heavy snow could not trigger.
- **Options:** Keep absolute meters only; normalize by min/max range; normalize by land elevation percentiles; implement a strategy switch.
- **Choice:** Add an `elevationStrategy` switch with a percentile-based path and map presets set to `percentile` with explicit min/max percentiles.
- **Rationale:** Percentiles scale with map size and elevation range, preserve relative mountain prominence, and keep snowline behavior stable across maps while still allowing absolute meters when needed.
- **Risk:** Percentile tuning must be explicit per map to avoid over-snowing low-relief worlds.
