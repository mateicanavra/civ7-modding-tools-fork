# Prework — `LOCAL-TBD-M4-PIPELINE-2` (Per-step config schemas + plumbing)

Goal: inventory current config inputs per pipeline step and propose the per-step schema surfaces so PIPELINE-2 implementation can be mostly mechanical.

Primary sources:
- Config schemas (TypeBox): `packages/mapgen-core/src/config/schema.ts`
- Current stage ordering bridge: `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`)
- (Archived but still useful) prior wiring audit: `docs/projects/engine-refactor-v1/resources/_archive/config-wiring-status.md`

## Matrix — step → config inputs → proposed per-step schema

Conventions:
- “Config today” describes where knobs come from in the current TS pipeline (global `ctx.config` reads, runtime-injected options, implicit constants).
- “Proposed step schema” references existing TypeBox schemas in `packages/mapgen-core/src/config/schema.ts` that can be re-used or carved down for recipe occurrence config.
- “Defaults” notes whether defaults are already expressed in TypeBox (good for `Value.Default(...)`) vs still hard-coded in runtime logic.

| Step (M3 id) | Config today (where/how) | Proposed step schema (TypeBox) | Defaults / notes |
| --- | --- | --- | --- |
| `foundation` | Foundation algorithm consumes `ctx.config.foundation.*` (plus dev diagnostics flags); other steps also read `ctx.config.foundation.dynamics.directionality.*` for biases. | `FoundationConfigSchema` (includes `dynamics.directionality`, diagnostics, etc.). | Many `foundation.diagnostics.*` fields have explicit schema defaults; directionality is cross-cutting (see “ownership notes”). |
| `landmassPlates` | Runtime currently passes `landmassCfg` from `config.landmass` (`orchestrator/task-graph.ts`); domain also falls back to `ctx.config.landmass` and `ctx.config.foundation.*` crustMode aliases; ocean separation reads `config.oceanSeparation` plus foundation policy/surface fallbacks. | `LandmassConfigSchema` + `OceanSeparationConfigSchema` (plus: decide whether to keep any `foundation.surface/policy` aliasing). | Recommend: recipe config becomes authoritative for landmass+oceanSeparation; treat `foundation.surface/policy` as legacy alias to delete later. |
| `coastlines` | No TS config usage; direct engine call `adapter.expandCoasts(width,height)` (`pipeline/morphology/CoastlinesStep.ts`). | (none) | Keep empty per-step config for parity. |
| `storySeed` | Reads top-level `config.margins.*` (`domain/narrative/tagging/margins.ts`). | `ContinentalMarginsConfigSchema` (top-level `margins`). | Schema defaults exist; code also has fallbacks consistent with schema defaults. |
| `storyHotspots` | Reads `config.story.hotspot.*` (`domain/narrative/tagging/hotspots.ts`). | `HotspotTunablesSchema` (or `StoryConfigSchema` subset for `hotspot`). | Defaults are defined in schema (maxTrails, steps, stepLen, minDistFromLand, minTrailSeparation, paradise/volcanic bias, peak chance). |
| `storyRifts` | Reads `config.story.rift.*` (`domain/narrative/tagging/rifts.ts`); also consults `config.foundation.dynamics.directionality.*` to bias stepping when `interplay.riftsFollowPlates` is enabled. | `RiftTunablesSchema` + shared `FoundationDirectionalityConfig` subset (via `FoundationConfigSchema.dynamics.directionality`). | Defaults exist for rift tunables; cross-cutting directionality remains an ownership question. |
| `ruggedCoasts` | Reads `config.coastlines.*` (`domain/morphology/coastlines/rugged-coasts.ts`) and `config.corridors.sea.*` (`domain/morphology/coastlines/corridor-policy.ts`). | `CoastlinesConfigSchema` + `SeaCorridorPolicySchema` (or `CorridorsConfigSchema` subset `sea`). | Schema defines defaults for corridor protection + many coastlines knobs; code still uses defensive fallbacks and clamps. |
| `storyOrogeny` | Reads `config.story.orogeny.*` (`domain/narrative/orogeny/belts.ts`). | `OrogenyTunablesSchema` (or `StoryConfigSchema` subset `orogeny`). | Defaults exist (radius, beltMinLength, windwardBoost, leeDrynessAmplifier). |
| `storyCorridorsPre` | Reads `config.corridors.*` (`domain/narrative/corridors/index.ts` and `domain/narrative/corridors/*.ts`); `sea-lanes.ts` also consults `config.foundation.dynamics.directionality.*` for orientation bias. | `CorridorsConfigSchema` + shared `FoundationDirectionalityConfig` subset. | Defaults exist for `sea`, `land`, `river`, `islandHop`. Directionality cross-cutting note applies. |
| `islands` | Reads `config.islands.*`, `config.story.hotspot.*` (biases/peak chance), and `config.corridors.sea.avoidRadius` (`domain/morphology/islands/placement.ts`). | `IslandsConfigSchema` + `HotspotTunablesSchema` (subset fields used) + `SeaCorridorPolicySchema` (avoidRadius). | Schema defaults exist for these fields; islands has several implicit fallbacks (also consistent with schema defaults). |
| `mountains` | Runtime currently passes `mountainOptions` from `config.mountains` (`orchestrator/task-graph.ts` → `pipeline/morphology/MountainsStep.ts`). | `MountainsConfigSchema` | Defaults are in schema; current runtime passes the whole config object (good parity). |
| `volcanoes` | Runtime currently passes `volcanoOptions` from `config.volcanoes` (`orchestrator/task-graph.ts` → `pipeline/morphology/VolcanoesStep.ts`). | `VolcanoesConfigSchema` | Defaults are in schema. |
| `lakes` | No `ctx.config` usage; uses engine `MapInfo.LakeGenerationFrequency` (`pipeline/hydrology/LakesStep.ts`). | (none) | Treat as settings/engine-provided; no per-step config required for parity. |
| `climateBaseline` | Reads `config.climate.baseline.*` via `applyClimateBaseline` (`domain/hydrology/climate/baseline.ts`). | `ClimateConfigSchema` subset: `baseline` (and any baseline helpers). | Many climate baseline fields have no defaults (optional tuning); recipe omission should rely on existing runtime behavior. |
| `storySwatches` | Reads `config.climate.swatches` and `config.climate.story.*` via `storyTagClimateSwatches` (`domain/hydrology/climate/swatches/index.ts` + submodules); also consults foundation directionality in chooser/monsoon bias modules. | `ClimateConfigSchema` subset: `swatches`, `story` + shared `FoundationDirectionalityConfig` subset. | Defaults exist for swatch selection/policies where modeled; verify which story sub-keys are defaulted vs optional. |
| `rivers` | Conditional paleo behavior reads `config.climate.story.paleo` (`pipeline/hydrology/RiversStep.ts`), then executes paleo tagging/artifact helpers. | `ClimateConfigSchema` subset: `story.paleo` | Schema intentionally does not default-in paleo block (disabled by omission). |
| `storyCorridorsPost` | Same codepath as corridors pre, but `stage=postRivers` uses `corridors.river.*` primarily (`domain/narrative/corridors/index.ts`). | `CorridorsConfigSchema` subset: `river` (and any shared corridor policy if backfill relies on it). | Defaults exist for `river` policy. |
| `climateRefine` | Reads `config.climate.refine.*` (`domain/hydrology/climate/refine/index.ts`), consults `config.story.orogeny.*` (`refine/orogeny-belts.ts`) and foundation directionality (`refine/orographic-shadow.ts`). | `ClimateConfigSchema` subset: `refine` + `OrogenyTunablesSchema` + shared `FoundationDirectionalityConfig` subset. | Defaults exist for many refine knobs; directionality + orogeny are cross-cutting dependencies. |
| `biomes` | Reads `config.biomes.*` and `config.corridors.{land,river}.*` (`domain/ecology/biomes/index.ts`). | `BiomeConfigSchema` + `CorridorsConfigSchema` subset (`land`, `river`). | Defaults exist in schema for corridor bias strengths and biome thresholds. |
| `features` | Reads `config.story.features.*` and `config.featuresDensity.*` (`domain/ecology/features/index.ts`). | `FeaturesConfigSchema` (via `StoryConfigSchema.features`) + `FeaturesDensityConfigSchema` | Defaults exist for all current knobs. |
| `placement` | Reads `config.placement.*` (`pipeline/placement/PlacementStep.ts`) and uses runtime starts + mapInfo. | `PlacementConfigSchema` | Defaults exist for most placement knobs; note that `starts` also interacts with engine-provided map size/mapInfo. |

## Steps with “no config” or special ownership questions

No-config steps (parity-safe to keep empty per-step config):
- `coastlines` (engine call only)
- `lakes` (engine mapInfo only)

Cross-cutting config (ownership/design questions for per-step config plumbing):
- `foundation.dynamics.directionality.*` is used by **multiple non-foundation steps** (rifts, sea-lanes/corridors, climate swatches/refine). PIPELINE-2 will need a decision on how this is supplied once “config must come from recipe occurrence only”:
  - duplicate the needed directionality fields into each step’s recipe config, or
  - treat directionality as part of global run `settings` (unlikely; not pure instance settings), or
  - publish a typed “directionality policy” artifact from foundation and have consumers read that artifact instead of config.
- Landmass/ocean separation currently consult `foundation.surface` / `foundation.policy` aliases. If per-step config becomes authoritative, these aliases become legacy-only and should be removed (likely in PIPELINE-5 cleanup).

## Validation rules (recommended inventory outcome)

For PIPELINE-2 implementation:
- Unknown keys should fail for recipe step entries and for step config objects when a schema exists (align with SPIKE §2.9 and PIPELINE-1 prework).
- Defaults should be applied via TypeBox defaults where present (`Value.Default(schema, userConfig)`), with runtime fallbacks remaining only as transitional parity guards.
- Steps that currently take runtime-injected config (`landmassPlates`, `mountains`, `volcanoes`, `placement`) should be migrated to consume **only** the per-occurrence recipe config (no hidden fallback to `ctx.config`).

