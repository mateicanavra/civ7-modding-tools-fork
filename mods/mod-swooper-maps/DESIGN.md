# Swooper Maps Design Notes

## Stage Manifest Overview
The bootstrap resolver now normalizes a `stageManifest` block that lives alongside the other map configuration groups. Each manifest entry describes:

- **`order`** – The canonical execution order for generator stages (`worldModel`, `landmass`, `coastlines`, `storySeed`, `storyHotspots`, etc.).
- **`stages`** – Stage descriptors capturing enablement, hard dependencies (`requires`), documented outputs (`provides`), and legacy toggle bindings (`legacyToggles`).
- **`blockedBy`** – Automatically populated by the resolver when a stage is disabled because a prerequisite is absent, disabled, or scheduled later in the pipeline.

Manifest data merges just like other config groups: defaults supply the canonical order, presets can override specific stage descriptors, and per-entry overrides replace or augment individual stage definitions.

## Dependency Diagnostics
During `refresh()` the resolver:

1. Clones defaults, presets, and overrides into a working manifest.
2. Applies explicit enable/disable flags or runtime toggles to each stage.
3. Validates the dependency graph. Stages with missing or disabled prerequisites are switched off and record a `blockedBy` reason.
4. Emits `console.warn` messages (prefixed with `[StageManifest]`) whenever a requested stage cannot run.

The `blockedBy` field survives into the resolved snapshot so downstream tooling can surface the reason alongside the stage status.

## Stage Config Providers

Entries and named presets can now declare a `stageConfig` map alongside their overrides. Each key maps to a stage identifier and indicates that the entry supplies configuration for that stage (for example, `storyHotspots`, `climateBaseline`, or `coastlines`). The resolver records this metadata and emits a warning whenever an entry customizes a stage that is disabled or missing from the manifest. This makes it easier to notice unused overrides—if a preset tweaks `storySwatches` but the manifest leaves that stage off, the console logs a `[StageManifest]` warning explaining that the overrides will be ignored until the stage is enabled.

The normalized snapshot exposes the resolved `stageConfig` map so diagnostics and tools can surface the same information.

## World Foundation Config Model

The physics pipeline now sources its inputs from a single top-level `foundation` group rather than piecing together `worldModel`, `landmass`, and ad-hoc policy overrides. The resolver hydrates `foundation` before `tunables.rebind()` so every stage observes the same normalized structure.

### Group layout

- **`foundation.seed`** – deterministic seeding (`mode`, optional `fixed`, per-system `offsets`, manifest fingerprint). The captured `plateSeed` ships with `FoundationContext` for diagnostics.
- **`foundation.plates`** – Voronoi layout controls (`count`, `convergenceMix`, `relaxationSteps`, `seedJitter`, `rotation`, `interiorSmooth`). Consumers no longer read `worldModel.plates` directly.
- **`foundation.dynamics`** – physics drivers that emit tensors (`wind`, `currents`, `mantle`, `directionality`). Each block exposes both raw config and normalized scalars so stages avoid re-deriving helpers.
- **`foundation.surface`** – continental targets and post-processing knobs (water targets, band geometry, plate-window adjustments, ocean separation policy).
- **`foundation.policy`** – consumer multipliers for coasts, climate, and separation that previously lived under `worldModel.policy`.
- **`foundation.diagnostics`** – opt-in logging (seed dumps, ASCII slices, manifest validation) so dev tooling can toggle them independently of gameplay presets.

### Migration hints

- The resolver currently backfills `foundation` from the legacy keys and emits `[Foundation]` warnings; presets should start writing both until the shim is removed.
- `foundation.surface.landmass` inherits the fields from `landmass.*`. Once presets move over, delete the duplicate `landmass` overrides to avoid drift.
- Old `worldModel.policy.oceanSeparation` becomes `foundation.surface.oceanSeparation` so the landmass utilities can read policy + surface data from the same bundle.

## Climate Primitives

The tunables bridge now exports a `CLIMATE` object with two helper views:

- `CLIMATE.drivers` – canonical baseline and refinement driver blocks mirroring the resolved `climate.baseline` and `climate.refine` groups.
- `CLIMATE.moistureAdjustments` – targeted adjustments consumed by rainfall layers and narrative overlays. It includes baseline coastal/orographic noise, refinement gradients, and story-scale rainfall deltas (hotspots, rifts, paleo motifs, etc.).

`layers/climate-engine.js` and story overlays reference these shared primitives instead of touching the raw config blocks directly. The climate overlays remain conservative, but the shared primitives make it easier to compose new moisture effects without duplicating normalization logic.


## Foundation Primitives

`tunables.rebind()` now hydrates a `FOUNDATION` bundle that mirrors the consolidated config:

- `FOUNDATION.core` – normalized seed + plate/dynamics payload (`seed`, `plates`, `dynamics`). Read-only consumers map directly to `FoundationContext`.
- `FOUNDATION.surface` – surface targets (`landmass`, plate windows, ocean separation) aligned with `foundation.surface`.
- `FOUNDATION.policy` – consumer multipliers subdivided into `policy.coasts`, `policy.climate`, and `policy.separation`.
- `FOUNDATION.diagnostics` – live logging toggles (seed dumps, ASCII summaries, manifest warnings) surfaced through dev tooling.
- Shortcut exports (`FOUNDATION_SEED`, `FOUNDATION_PLATES`, `FOUNDATION_DIRECTIONALITY`, etc.) replace the old `WORLDMODEL_*` constants so layers can import only what they need.

Layers consume these helpers instead of reaching into raw config groups. This keeps the plate/wind/currents contract aligned with the `foundation` block in `BASE_CONFIG` and makes it easier to reuse policy defaults when adding new morphology consumers. During the migration the bridge emits `[Foundation]` warnings whenever legacy getters are invoked; remove `worldModel` accesses once consumers read the new bundle.

## Legacy Toggles
Legacy `STORY_ENABLE_*` toggles are now derived from the manifest. Each stage lists the toggle keys it controls. The resolver writes the resolved on/off state back onto the `toggles` group so existing callers continue to work. The tunables bridge reads the manifest first, falling back to any residual toggle values in case an entry opts out of the manifest system.

When you introduce a new stage:

1. Add its identifier to the `StageName` union in `map_config.types.js`.
2. Extend `stageManifest.order` and create a descriptor with `requires`, `legacyToggles`, and optional `provides` metadata inside `defaults/base.js`.
3. Update presets or map entries only if they need to opt-in/out of the new stage.
4. Consider adding dependency-aware warnings if the stage relies on optional data (world model, rivers, etc.).

## Runtime Helpers
Two runtime helpers expose the manifest to the orchestrator and tests:

- `resolved.STAGE_MANIFEST()` returns the normalized manifest snapshot.
- `tunables.stageEnabled("stageName")` reports whether a specific stage survived dependency validation. Use this instead of reading raw toggles when you need to know whether a layer actually runs.
