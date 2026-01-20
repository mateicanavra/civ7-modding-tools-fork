# Hydrology refactor — legacy disposition ledger (keep / kill / migrate)

Purpose: provide the **exhaustive keep/kill/migrate classification** required by the vertical domain refactor workflow for Hydrology, covering:
- public config properties (today’s `ClimateConfigSchema` and op strategy config),
- public/exported function surfaces, and
- hydrology-adjacent surfaces that are in-scope because they currently affect Hydrology outputs.

This is a Phase 3 artifact (planning). It must not introduce target-model changes; it implements the Phase 2 model posture by classifying legacy surfaces.

## Authority stack

Model authority:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`

Current-state evidence:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state-synthesis.md`

Primary code evidence (paths):
- `mods/mod-swooper-maps/src/domain/hydrology/**`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-*/**`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/**`

## Legend

- **Keep**: survives as a public surface (shape may tighten, but intent remains public and stable).
- **Migrate**: intent/mechanism survives, but the surface moves/changes:
  - “migrate → internal” means the knob becomes part of the normalized internal parameter set (not public),
  - “migrate → downstream” means it becomes a downstream-owned projection/shim (explicitly deprecated if transitional).
- **Kill**: removed; not part of the Hydrology target model (may exist only as a downstream narrative overlay concept that does not feed Hydrology).

## A) Public config properties (Hydrology)

Source: historical Hydrology config bag (formerly `mods/mod-swooper-maps/src/domain/hydrology/config.ts`, deleted) plus current Hydrology op contracts under `mods/mod-swooper-maps/src/domain/hydrology/ops/**/contract.ts`.

Phase 2 posture recap (authoritative; do not restate model beyond this):
- Public config becomes **semantic knobs only**.
- No regional overrides, no swatches, no story-driven climate inputs, no paleo climate modifiers.

### A.1 `climate.baseline.*` (latitude-band baseline bag)

Disposition rule:
- Everything in `climate.baseline.*` is **not kept public** (latitude bands as a climate model are explicitly rejected in Phase 2).
- Any physics-relevant *intent* migrates into normalized internal parameters (e.g., “global moisture availability”, “orographic efficiency”), but not as latitude-band targets.

| Property path | Disposition | Notes (replacement / migration target) |
| --- | --- | --- |
| `climate.baseline` | Migrate → internal | Replaced by semantic knobs + compiled internal params (no public bag). |
| `climate.baseline.seed` | Migrate → internal | Maps to internal moisture-source + evap scaling defaults; not public. |
| `climate.baseline.seed.baseRainfall` | Migrate → internal | Reinterpreted as global moisture availability baseline; superseded by `dryness` knob. |
| `climate.baseline.seed.coastalExponent` | Migrate → internal | Reinterpreted as coastal moisture penetration efficiency; internal only. |
| `climate.baseline.bands` | Kill | Latitude-band rainfall targets are banned as the driver of climate realism. Latitude remains only a forcing input. |
| `climate.baseline.bands.deg0to10` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.deg10to20` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.deg20to35` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.deg35to55` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.deg55to70` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.deg70plus` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.edges` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.edges.deg0to10` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.edges.deg10to20` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.edges.deg20to35` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.edges.deg35to55` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.edges.deg55to70` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.bands.transitionWidth` | Kill | See `climate.baseline.bands`. |
| `climate.baseline.sizeScaling` | Migrate → internal | Map-size scaling belongs in compilation to internal params; not public. |
| `climate.baseline.sizeScaling.baseArea` | Migrate → internal | Internal scaling helper only. |
| `climate.baseline.sizeScaling.minScale` | Migrate → internal | Internal scaling helper only. |
| `climate.baseline.sizeScaling.maxScale` | Migrate → internal | Internal scaling helper only. |
| `climate.baseline.sizeScaling.equatorBoostScale` | Kill | Equator “boost” is latitude-band modeling by another name; replaced by circulation + insolation + seasonal scaffold. |
| `climate.baseline.sizeScaling.equatorBoostTaper` | Kill | See `equatorBoostScale`. |
| `climate.baseline.blend` | Kill | Blend between “seed rainfall” and “latitude targets” is coupled to the killed model. |
| `climate.baseline.blend.baseWeight` | Kill | See `climate.baseline.blend`. |
| `climate.baseline.blend.bandWeight` | Kill | See `climate.baseline.blend`. |
| `climate.baseline.orographic` | Migrate → internal | Orographic uplift/rainout is a first-class physics mechanism, but parameters are internal only. |
| `climate.baseline.orographic.hi1Threshold` | Migrate → internal | Internal-only orographic tuning (or superseded by continuous uplift). |
| `climate.baseline.orographic.hi1Bonus` | Migrate → internal | Internal-only. |
| `climate.baseline.orographic.hi2Threshold` | Migrate → internal | Internal-only. |
| `climate.baseline.orographic.hi2Bonus` | Migrate → internal | Internal-only. |
| `climate.baseline.coastal` | Migrate → internal | Coastal moisture sourcing remains; parameters internal only. |
| `climate.baseline.coastal.coastalLandBonus` | Migrate → internal | Internal-only coastal moisture uplift. |
| `climate.baseline.coastal.spread` | Migrate → internal | Internal-only. |
| `climate.baseline.noise` | Kill | Stochastic rainfall “jitter” is not part of the physics-first posture; spatial variability emerges from circulation + orography + ocean coupling. |
| `climate.baseline.noise.baseSpanSmall` | Kill | See `climate.baseline.noise`. |
| `climate.baseline.noise.spanLargeScaleFactor` | Kill | See `climate.baseline.noise`. |
| `climate.baseline.noise.scale` | Kill | See `climate.baseline.noise`. |

### A.2 `climate.refine.*` (physics-ish refine bag)

Disposition rule:
- Mechanisms that are legitimately physical (orographic shadow, coastal gradient proxies, river corridor moisture as a *derived consequence*) **migrate** into the causal spine as internal ops/params.
- Any refine pass that is “because narrative says so” is killed (see story section).

| Property path | Disposition | Notes |
| --- | --- | --- |
| `climate.refine` | Migrate → internal | The *idea* of second-pass refinement survives, but becomes physics-only ops; no public bag. |
| `climate.refine.waterGradient` | Migrate → internal | Becomes part of moisture sourcing/continentality diagnostics; internal only. |
| `climate.refine.waterGradient.radius` | Migrate → internal | Internal-only. |
| `climate.refine.waterGradient.perRingBonus` | Migrate → internal | Internal-only. |
| `climate.refine.waterGradient.lowlandBonus` | Migrate → internal | Internal-only. |
| `climate.refine.orographic` | Migrate → internal | Orographic rain-shadow is a core mechanism; internal only. |
| `climate.refine.orographic.steps` | Migrate → internal | Internal-only. |
| `climate.refine.orographic.reductionBase` | Migrate → internal | Internal-only. |
| `climate.refine.orographic.reductionPerStep` | Migrate → internal | Internal-only. |
| `climate.refine.riverCorridor` | Migrate → internal | River corridor wetness becomes a *derived diagnostic* (downstream-friendly wetness proxy), not a narrative override. |
| `climate.refine.riverCorridor.adjacencyRadius` | Migrate → internal | Internal-only; may become fixed constant if stable. |
| `climate.refine.riverCorridor.lowlandAdjacencyBonus` | Migrate → internal | Internal-only. |
| `climate.refine.riverCorridor.highlandAdjacencyBonus` | Migrate → internal | Internal-only. |
| `climate.refine.lowBasin` | Migrate → internal | Endorheic/low basin moisture retention becomes part of land water budget + lake persistence; internal only. |
| `climate.refine.lowBasin.radius` | Migrate → internal | Internal-only. |
| `climate.refine.lowBasin.delta` | Migrate → internal | Internal-only. |

### A.3 `climate.swatches.*` (authored macro overrides)

Disposition rule:
- Swatches are explicitly banned as “designer thumbs on the scale” and must be removed.

| Property path | Disposition | Notes |
| --- | --- | --- |
| `climate.swatches` | Kill | Remove from public config; swatches are banned. |
| `climate.swatches.enabled` | Kill | See `climate.swatches`. |
| `climate.swatches.types` | Kill | See `climate.swatches`. |
| `climate.swatches.sizeScaling` | Kill | See `climate.swatches`. |
| `climate.swatches.sizeScaling.widthMulSqrt` | Kill | See `climate.swatches`. |
| `climate.swatches.sizeScaling.lengthMulSqrt` | Kill | See `climate.swatches`. |

### A.4 `climate.story.*` (story-driven climate modifiers + paleo)

Disposition rule:
- Hydrology must not accept narrative/story inputs to perturb physics.
- These properties are killed as Hydrology config.
- If Narrative later needs story overlays, it owns them as downstream overlays that do not feed Hydrology.

| Property path | Disposition | Notes |
| --- | --- | --- |
| `climate.story` | Kill | Remove from Hydrology config surface. |
| `climate.story.rainfall` | Kill | Narrative-motif rainfall boosts are banned as Hydrology inputs. |
| `climate.story.rainfall.riftRadius` | Kill | See `climate.story.rainfall`. |
| `climate.story.rainfall.riftBoost` | Kill | See `climate.story.rainfall`. |
| `climate.story.rainfall.paradiseDelta` | Kill | See `climate.story.rainfall`. |
| `climate.story.rainfall.volcanicDelta` | Kill | See `climate.story.rainfall`. |
| `climate.story.paleo` | Kill | Paleo climate/hydrology edits are banned as Hydrology climate inputs. |
| `climate.story.paleo.maxDeltas` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.deltaFanRadius` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.deltaMarshChance` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.maxOxbows` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.oxbowElevationMax` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.maxFossilChannels` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.fossilChannelLengthTiles` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.fossilChannelStep` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.fossilChannelHumidity` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.fossilChannelMinDistanceFromCurrentRivers` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.bluffWetReduction` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.sizeScaling` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.sizeScaling.lengthMulSqrt` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.elevationCarving` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.elevationCarving.enableCanyonRim` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.elevationCarving.rimWidth` | Kill | See `climate.story.paleo`. |
| `climate.story.paleo.elevationCarving.canyonDryBonus` | Kill | See `climate.story.paleo`. |

### A.5 Op strategy config: `hydrology/compute-wind-fields` (historical; deleted)

Source (historical): formerly `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-wind-fields/contract.ts` (deleted during M9 refactor).
Successor surface: `hydrology/compute-atmospheric-circulation` (`mods/mod-swooper-maps/src/domain/hydrology/ops/compute-atmospheric-circulation/contract.ts`).

Disposition rule:
- The *existence* of a circulation op is kept, but the specific config and implementation migrates to the Phase 2 circulation + ocean coupling catalog.

| Property path | Disposition | Notes |
| --- | --- | --- |
| `hydrology/compute-wind-fields.strategies.default.windJetStreaks` | Migrate → internal | Replaced by circulation scaffold params; not a public author knob. |
| `hydrology/compute-wind-fields.strategies.default.windJetStrength` | Migrate → internal | Internal-only. |
| `hydrology/compute-wind-fields.strategies.default.windVariance` | Migrate → internal | Internal-only; variance must remain deterministic and physically constrained. |

## B) Exported function surfaces (Hydrology)

Rule: this section inventories **exported** surfaces (what other modules can import) and classifies them.

### B.1 Domain entrypoints

Source:
- `mods/mod-swooper-maps/src/domain/hydrology/index.ts`

| Surface | Disposition | Notes |
| --- | --- | --- |
| `@mapgen/domain/hydrology` default export (`defineDomain({ id: "hydrology", ops })`) | Keep | Domain entrypoint remains. |
| `HydrologyWindFieldSchema` export | Migrate | Likely becomes `HydrologyCirculationFieldSchema` (winds + currents), with typed-array posture; keep export surface stable by re-exporting the canonical schema name used by stage artifacts. |

### B.2 Ops

Source:
- `mods/mod-swooper-maps/src/domain/hydrology/ops/contracts.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-atmospheric-circulation/**`

| Surface | Disposition | Notes |
| --- | --- | --- |
| `hydrology.ops.computeAtmosphericCirculation` contract | Keep | Contract-first circulation op (Phase 2 posture). |

### B.3 Climate module exports

Source:
- `mods/mod-swooper-maps/src/domain/hydrology/climate/index.ts`

| Surface | Disposition | Notes |
| --- | --- | --- |
| `applyClimateBaseline` | Migrate | Replaced by causal ops in the Phase 2 spine; keep the functionality but not the API. |
| `refineClimateEarthlike` | Migrate | Split into physics-only ops (orography, moisture transport, cryosphere feedback). Must drop narrative inputs. |
| `applyClimateSwatches` | Kill | Swatches are banned. Remove export and implementation subtree. |
| `ClimateAdapter` / `ClimateRuntime` / `ClimateConfig` / `ClimateSwatchResult` / `OrogenyCache` types | Migrate | Replaced by Hydrology-internal buffer/field types; any remaining types should align to the new op inputs/outputs. |

## C) Hydrology-adjacent runtime/recipe surfaces (in-scope)

These are not domain exports, but they directly affect Hydrology outputs today and must be dispositioned for the vertical refactor plan.

| Surface | Disposition | Notes |
| --- | --- | --- |
| `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/**` | Kill | Delete stage; authored climate intervention is banned. |
| `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` overlay reads (`readOverlayMotifs*`) | Kill | Remove narrative motif inputs to Hydrology climate mutation. |
| `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts` `storyTagClimatePaleo(...)` | Kill | Remove; paleo hydrology is not a Hydrology input. |
| `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/artifacts.ts` `RiverAdjacencyArtifactSchema = Type.Any()` | Migrate | Tighten to typed arrays or replace with a richer hydrography artifact as part of Slice 5. |
