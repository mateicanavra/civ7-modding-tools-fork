---
id: CIV-56
title: "[M4] Pipeline cutover: per-step config schemas + executor plumbing"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: CIV-54
children: []
blocked_by: [CIV-55]
blocked: [CIV-57, CIV-58]
related_to: [CIV-46]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make per-step config real: steps own TypeBox config schemas, the compiler validates/normalizes recipe-supplied config into the `ExecutionPlan`, and the executor passes the resolved config into `step.run(ctx, config)`. No step algorithm changes.

## Why This Exists

We already accepted recipe-driven composition and `ExecutionPlan` as the sole compiled “effective run” artifact. Without per-step config plumbing, recipes can’t express real variation and the codebase will keep pulling knobs from legacy `stageConfig`/globals.

## Recommended Target Scope

### In scope

- Extend the step definition contract to include:
  - a TypeBox config schema (step-owned)
- Apply defaults via TypeBox defaults using `Value.Default(stepConfigSchema, userConfig)` so recipe config can be omitted safely.
- Ensure `compileExecutionPlan(...)` validates and normalizes per-occurrence config using the step’s schema.
- Ensure `ExecutionPlan` plan nodes carry the resolved per-occurrence config.
- Update the executor to call `step.run(ctx, config)` with the resolved config (no silent fallbacks to legacy config).
- Keep the repo runnable with the standard recipe (defaults preserve current behavior).

### Out of scope

- Changing step algorithms or tuning behavior.
- Converting recipe authoring from linear → DAG.
- Removing `stageManifest`/`STAGE_ORDER`/`stageConfig` call sites (handled by PIPELINE‑5).

## Acceptance Criteria

- Step definitions expose a config schema in the registry (TypeBox; no new validation deps).
- `compileExecutionPlan` rejects invalid per-step config and unknown keys with clear errors.
- `ExecutionPlan` nodes include resolved per-step config and the executor passes it into step execution.
- The standard recipe can be executed end-to-end with no dependence on `stageConfig` for step-local knobs.
- `pnpm -C packages/mapgen-core check` passes.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend a focused unit test that proves:
  - recipe config is validated against a step schema
  - a resolved config reaches `step.run(ctx, config)`

## Dependencies / Notes

- **Parent:** [CIV-54](CIV-54-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** CIV-55 (boundary + compiler skeleton exists)
- **Blocks:** CIV-57, CIV-58 (runtime cutover should not land with “config ignored” semantics)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer minimal surface area:
  - add config schema to the step definition type
  - thread resolved config through compiler → plan → executor
- Do not introduce a second config mega-object; per-step config comes from the recipe occurrence only.
- Current gap: `MapGenStep` in `packages/mapgen-core/src/pipeline/types.ts` has no config argument; `PipelineExecutor` runs steps without config.
- Reference the existing config wiring status:
  - `packages/mapgen-core/src/config/schema.ts`
  - `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`

## Implementation Decisions

### Plumb explicit per-step config into step/domain call sites
- **Context:** Many step/domain functions read `ctx.config.*` directly; per-step recipe config is now authoritative.
- **Options:** Keep a context swap shim, keep `ctx.config` fallbacks, or pass explicit config arguments through steps and domain helpers.
- **Choice:** Pass explicit config into step/run and domain helpers; remove the StepConfigView/context swap.
- **Rationale:** Makes per-step config the single source of truth and avoids hidden legacy reads.
- **Risk:** Requires touching many call sites; missed call sites will surface as runtime errors.

### Keep cross-cutting directionality inside step config (for now)
- **Context:** ADR-ER1-019 targets directionality as `RunRequest.settings`, but the settings surface is not yet plumbed into runtime steps.
- **Options:** Extend `RunSettings` and migrate consumers now, duplicate directionality into each step config that needs it, or leave legacy `ctx.config.foundation.dynamics.directionality` reads untouched.
- **Choice:** Include `foundation.dynamics.directionality` in the per-step config view for steps that need it.
- **Rationale:** Enables per-step config validation without expanding settings in this slice.
- **Risk:** Diverges from ADR-ER1-019; requires a follow-up migration to settings.

### Enforce empty config for no-config steps
- **Context:** Steps like `coastlines` and `lakes` should reject unknown config keys.
- **Options:** Omit `configSchema`, define an empty schema, or accept arbitrary config objects.
- **Choice:** Define `configSchema` as an empty object with `additionalProperties: false`.
- **Rationale:** Aligns with “unknown keys fail” and keeps config surface explicit.
- **Risk:** Requires recipe updates if someone previously relied on extra config keys.

### TaskGraph builds a standard RunRequest from MapGenConfig
- **Context:** TaskGraph still needs a standard recipe path while per-step config becomes authoritative.
- **Options:** Use schema defaults only, read full `context.config`, or compile a `RunRequest` from `MapGenConfig` slices per step.
- **Choice:** Compile a standard `RunRequest` from `MapGenConfig` and execute via `executePlan`; keep `execute(...)` defaults-only for true bare recipes.
- **Rationale:** Preserves existing override behavior while making per-step config explicit and validated.
- **Risk:** Requires keeping the per-step config mapping in sync with step schemas.

## Prework Prompt (Agent Brief)

Goal: build a per-step config inventory so schema work is mechanical and consistent.

Deliverables:
- A matrix: step ID -> current config inputs (stageConfig/global constants/implicit defaults) -> proposed per-step schema + default values.
- A list of steps with no config usage or unclear config ownership, with notes on open questions.
- A short note on validation rules to enforce (unknown keys fail; defaults via schema or explicit step defaults).

Where to look:
- Status doc: `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`.
- Config schema: `packages/mapgen-core/src/config/schema.ts`.
- Step definitions and config reads: `packages/mapgen-core/src/pipeline/**` (search for `stageConfig`, config lookups, or step-local config usage).

Constraints/notes:
- Keep this as inventory only; do not change code.
- Per-step config must come from the recipe occurrence only (no new mega-config).
- Use TypeBox conventions when sketching schemas.

## Pre-work

Goal: inventory current config inputs per pipeline step and propose the per-step schema surfaces so PIPELINE-2 implementation can be mostly mechanical.

Primary sources:
- Config schemas (TypeBox): `packages/mapgen-core/src/config/schema.ts`
- Current stage ordering bridge: `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`)
- (Archived but still useful) prior wiring audit: `docs/projects/engine-refactor-v1/resources/_archive/config-wiring-status.md`

### Matrix — step → config inputs → proposed per-step schema

Conventions:
- "Config today" describes where knobs come from in the current TS pipeline (global `ctx.config` reads, runtime-injected options, implicit constants).
- "Proposed step schema" references existing TypeBox schemas in `packages/mapgen-core/src/config/schema.ts` that can be re-used or carved down for recipe occurrence config.
- "Defaults" notes whether defaults are already expressed in TypeBox (good for `Value.Default(...)`) vs still hard-coded in runtime logic.

| Step (M3 id) | Config today (where/how) | Proposed step schema (TypeBox) | Defaults / notes |
| --- | --- | --- | --- |
| `foundation` | Foundation algorithm consumes `ctx.config.foundation.*` (plus dev diagnostics flags); other steps also read `ctx.config.foundation.dynamics.directionality.*` for biases. | `FoundationConfigSchema` (includes `dynamics.directionality`, diagnostics, etc.). | Many `foundation.diagnostics.*` fields have explicit schema defaults; directionality is cross-cutting (see "ownership notes"). |
| `landmassPlates` | Runtime currently passes `landmassCfg` from `config.landmass` (`orchestrator/task-graph.ts`); domain also falls back to `ctx.config.landmass` and `ctx.config.foundation.*` crustMode aliases; ocean separation reads `config.oceanSeparation` plus foundation policy/surface fallbacks. | `LandmassConfigSchema` + `OceanSeparationConfigSchema` (no continued `foundation.surface/policy` aliasing; ADR-ER1-026). | Recipe config is authoritative for landmass+oceanSeparation; treat `foundation.surface/policy` as legacy alias to remove during M4 cleanup (ADR-ER1-026). |
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

### Steps with "no config" or special ownership questions

No-config steps (parity-safe to keep empty per-step config):
- `coastlines` (engine call only)
- `lakes` (engine mapInfo only)

Cross-cutting config (ownership/design questions for per-step config plumbing):
- `foundation.dynamics.directionality.*` is used by **multiple non-foundation steps** (rifts, sea-lanes/corridors, climate swatches/refine).
  - **Decision (ADR-ER1-019):** treat the cross-cutting directionality policy as part of RunRequest `settings` (typed/shared), and migrate consumers to read from settings (not from other steps' config and not from `ctx.config.foundation.*`).
  - **Explicit non-goal for M4:** do not introduce a foundation-produced "directionality policy artifact" as a new cross-step dependency surface without a separate follow-up decision.
- Landmass/ocean separation currently consult `foundation.surface` / `foundation.policy` aliases.
  - **Decision (ADR-ER1-026):** no continued aliasing; remove legacy alias reads during M4 cleanup so "what recipe says" is authoritative.

### Validation rules (recommended inventory outcome)

For PIPELINE-2 implementation:
- Unknown keys should fail for recipe step entries and for step config objects when a schema exists (align with SPIKE §2.9 and PIPELINE-1 prework).
- Defaults should be applied via TypeBox defaults where present (`Value.Default(schema, userConfig)`), with runtime fallbacks remaining only as transitional parity guards.
- Steps that currently take runtime-injected config (`landmassPlates`, `mountains`, `volcanoes`, `placement`) should be migrated to consume **only** the per-occurrence recipe config (no hidden fallback to `ctx.config`).
