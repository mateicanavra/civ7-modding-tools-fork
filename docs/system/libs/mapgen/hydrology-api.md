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

- Schema: `mods/mod-swooper-maps/src/domain/hydrology/knobs.ts` (`HydrologyKnobsSchema`)
- Resolver: `mods/mod-swooper-maps/src/domain/hydrology/knobs.ts` (`resolveHydrologyKnobs`)

Semantics:
- Missing/undefined → defaults.
- `{}` → all defaults.
- `null` → invalid at schema boundary (some compile call sites treat it as “missing” before validation).
- Determinism: same knobs + same seeds ⇒ identical Hydrology outputs.

Practical guidance:
- `dryness`: global wet/dry bias (scales rainfall + moisture supply; not regional “paint”).
- `temperature`: global thermal bias (baseline temperature; influences cryosphere).
- `seasonality`: seasonal texture intent (winds variability + rainfall noise structure).
- `oceanCoupling`: ocean influence preset (winds, currents, transport iterations).
- `cryosphere`: enables/disables bounded cryosphere/albedo feedback and cryosphere products.
- `riverDensity`: river projection density (thresholding on discharge-derived fields; monotonic).
- `lakeiness`: lake projection frequency (does not change routing/discharge truth).

## Stages, steps, and step configs (recipe-facing)

Hydrology stages (standard recipe):
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/`

Stage public config:
- `hydrology-climate-baseline`, `hydrology-hydrography`, `hydrology-climate-refine` accept `knobs` plus optional advanced step/op config.
- Knobs provide the author-facing semantic surface; advanced config can override the internal defaults directly.

Step config schemas:
- Lakes: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.contract.ts` (`tilesPerLakeMultiplier`)
- Climate baseline: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.contract.ts` (empty; knobs only)
- Rivers: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts` (`minLength`/`maxLength`, engine projection-only)
- Climate refine: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/steps/climateRefine.contract.ts` (empty; knobs only)

## Artifacts (published products)

Hydrology publishes typed artifacts for dependency gating and stable consumption:

- `artifact:heightfield`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`HeightfieldArtifactSchema`)
- `artifact:climateField`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`ClimateFieldArtifactSchema`)
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
- `hydrology/compute-precipitation` — humidity + terrain/orography + `perlinSeed` → rainfall/humidity (baseline + refine)
- `hydrology/compute-land-water-budget` — rainfall/humidity/temperature → PET + aridityIndex (advisory)
- `hydrology/accumulate-discharge` — Morphology routing + climate → runoff + discharge + sink/outlet masks
- `hydrology/project-river-network` — discharge → riverClass + computed thresholds (projection-only; monotonic)
- `hydrology/compute-cryosphere-state` — temperature + rainfall → snow/ice/albedo + freezeIndex
- `hydrology/apply-albedo-feedback` — bounded iterations → temperature refinement (optional/knob-gated)
- `hydrology/compute-climate-diagnostics` — climate signals → advisory diagnostics indices

## Refactor workflow references

- Domain refactor workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Implementation contract: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
- Hydrology implementation prompt (Phases 4–5): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/HYDROLOGY-IMPLEMENTATION.md`
