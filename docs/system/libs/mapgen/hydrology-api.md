# Hydrology API & Schemas

This page is the **code-facing contract** for Hydrology in MapGen: the schemas, knobs, artifacts, and op contracts that
define what Hydrology *accepts* and what it *publishes*.

See `docs/system/libs/mapgen/hydrology.md` for the **conceptual domain spec** (causality, responsibilities, products).

## Scope and invariants

- **Model-first:** the Phase 2 Hydrology model is authoritative; schemas and projections serve the model, not vice versa.
- **No compat inside Hydrology:** Hydrology must not publish legacy compat surfaces. Transitional shims (if any) must live downstream.
- **Ops are data-pure:** no runtime views/callbacks/trace handles cross op boundaries.
- **RNG crosses boundaries as data:** steps pass deterministic seeds; ops build local RNGs.
- **Defaults belong in schemas:** derived/scaled values belong in normalize/compile; run code assumes normalized configs.

## Entry points

- Domain definition: `mods/mod-swooper-maps/src/domain/hydrology/index.ts`
- Runtime binding: `mods/mod-swooper-maps/src/domain/hydrology/ops.ts`
- Op contracts (inputs/outputs/strategy configs): `mods/mod-swooper-maps/src/domain/hydrology/ops/*/contract.ts`

## Public knobs (author-facing)

Hydrology is configured via a small set of **semantic knobs** (scenario-level intent), not algorithm parameters:

- Leaf knob schemas + resolver: `mods/mod-swooper-maps/src/domain/hydrology/shared/knobs.ts`
- Stage-scoped `knobsSchema` definitions live inline at the stage boundary:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/index.ts`

Semantics:
- Missing/undefined → defaults.
- `{}` → all defaults.
- `null` → invalid at schema boundary (some compile call sites treat it as “missing” before validation).
- Determinism: same knobs + same seeds ⇒ identical Hydrology outputs.
- Combination rule (overrides-first; knobs-last):
  - Step configs are validated and defaulted first (schemas + `defaultConfig`).
  - Knobs apply after as deterministic transforms over the defaulted baseline (knobs can modify author-provided advanced config values; they are not “fill missing”).

Practical guidance:
- `dryness`: global wet/dry bias (scales rainfall + moisture supply; not regional “paint”).
- `temperature`: global thermal bias (baseline temperature; influences cryosphere).
- `seasonality`: seasonal cycle intent (annual amplitude fields + wind/precip texture; Hydrology does not publish per-season snapshots).
- `oceanCoupling`: ocean influence preset (winds, currents, transport iterations).
- `cryosphere`: enables/disables bounded cryosphere/albedo feedback and cryosphere products.
- `riverDensity`: river projection density (thresholding on discharge-derived fields; monotonic).
- `lakeiness`: lake projection frequency (does not change routing/discharge truth).

## Knob mappings (knob → numeric)

Knobs compile into numeric parameters through **named internal mappings** (no “magic numbers” in random normalize code).

- Source of truth: `mods/mod-swooper-maps/src/domain/hydrology/shared/knob-multipliers.ts`
- `dryness`:
  - `wet` → `wetnessScale = 1.15`
  - `mix` → `wetnessScale = 1.0`
  - `dry` → `wetnessScale = 0.85`
- `temperature`:
  - `cold` → `baseTemperatureC = 6`
  - `temperate` → `baseTemperatureC = 14`
  - `hot` → `baseTemperatureC = 22`
- `seasonality`:
  - `low` → `windJetStreaks = 2`, `windVariance = 0.45`, `noiseAmplitude = 5`, `modeCount=2`, `axialTiltDeg=12`
  - `normal` → `windJetStreaks = 3`, `windVariance = 0.6`, `noiseAmplitude = 6`, `modeCount=2`, `axialTiltDeg=18`
  - `high` → `windJetStreaks = 4`, `windVariance = 0.75`, `noiseAmplitude = 8`, `modeCount=4`, `axialTiltDeg=23.44`
- `oceanCoupling`:
  - `off` → `windJetStrength = 0.85`, `currentStrength = 0`, `transportIterations = 18`, `waterGradient.radius = 4`
  - `simple` → `windJetStrength = 1.0`, `currentStrength = 0.75`, `transportIterations = 24`, `waterGradient.radius = 5`
  - `earthlike` → `windJetStrength = 1.05`, `currentStrength = 1.0`, `transportIterations = 28`, `waterGradient.radius = 6`
- `lakeiness`: `tilesPerLakeMultiplier` (`few=1.5`, `normal=1.0`, `many=0.7`)
- `riverDensity`:
  - Length bounds (`minLength`/`maxLength`) and projection thresholds (`minorPercentile`/`majorPercentile`) are mapped by density preset.

## Stages, steps, and step configs (recipe-facing)

Hydrology stages (standard recipe):
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/`
- Gameplay projection: `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/`

Stage public config:
- `hydrology-climate-baseline`, `hydrology-hydrography`, `hydrology-climate-refine` accept `knobs` plus optional advanced step/op config.
- Advanced config defines the baseline (defaults + explicit tuning); knobs apply after as deterministic transforms.

Step config schemas:
- Lakes: `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/lakes.contract.ts` (`tilesPerLakeMultiplier`)
- Climate baseline: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.contract.ts` (advanced seasonality override only; knobs preferred)
- Rivers (hydrography truth): `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts`
- Rivers (engine projection): `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/plotRivers.contract.ts` (`minLength`/`maxLength`)
- Climate refine: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/steps/climateRefine.contract.ts` (empty; knobs only)

## Artifacts (published products)

Hydrology publishes typed artifacts for dependency gating and stable consumption:

- `artifact:climateField`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`ClimateFieldArtifactSchema`)
- `artifact:hydrology.climateSeasonality`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`ClimateSeasonalityArtifactSchema`)
- `artifact:hydrology._internal.windField`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`HydrologyWindFieldSchema`, internal)
- `artifact:hydrology.hydrography`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/artifacts.ts` (`HydrologyHydrographyArtifactSchema`, canonical read path)
- `artifact:hydrology.climateIndices`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/artifacts.ts` (`HydrologyClimateIndicesSchema`)
- `artifact:hydrology.cryosphere`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/artifacts.ts` (`HydrologyCryosphereSchema`)
- `artifact:hydrology.climateDiagnostics`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/artifacts.ts` (`HydrologyClimateDiagnosticsSchema`, advisory)

Notes:
- Some artifacts act as **buffer handles** routed through artifacts for gating/typing (publish once, then refine in place).
- Engine-facing projections (rivers/lakes) may diverge from Hydrology truth; do not treat engine state as authoritative inside Hydrology.

## Op contracts (operation-level APIs)

Each Hydrology op has:
- a typed **input schema**,
- a typed **output schema**,
- one or more **strategy config schemas** (default/refine/etc).

Contracts live under `mods/mod-swooper-maps/src/domain/hydrology/ops/*/contract.ts`:

- `hydrology/compute-radiative-forcing` — latitude → insolation proxy
- `hydrology/compute-thermal-state` — insolation + elevation + landMask → surfaceTemperatureC
- `hydrology/compute-atmospheric-circulation` — latitude + `rngSeed` → windU/windV
- `hydrology/compute-ocean-surface-currents` — winds + waterMask → currentU/currentV
- `hydrology/compute-evaporation-sources` — landMask + temperature → evaporation sources
- `hydrology/transport-moisture` — winds + evaporation → humidity field (fixed-iteration, bounded)
- `hydrology/compute-precipitation` — humidity + orography + `perlinSeed` → rainfall/humidity (baseline + refine)
- `hydrology/compute-land-water-budget` — rainfall/humidity/temperature → PET + aridityIndex (advisory)
- `hydrology/accumulate-discharge` — Morphology routing + climate → runoff + discharge + sink/outlet masks
- `hydrology/project-river-network` — discharge → riverClass + computed thresholds (projection-only; monotonic)
- `hydrology/compute-cryosphere-state` — temperature + rainfall → snow/ice/albedo + freezeIndex + (groundIce01/permafrost01/meltPotential01)
- `hydrology/apply-albedo-feedback` — bounded iterations → temperature refinement (optional/knob-gated)
- `hydrology/compute-climate-diagnostics` — climate signals → advisory diagnostics indices

## Refactor workflow references

- Domain refactor workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Implementation contract: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
- Hydrology implementation prompt (Phases 4–5): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/HYDROLOGY-IMPLEMENTATION.md`
