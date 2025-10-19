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

## Climate Primitives

The tunables bridge now exports a `CLIMATE` object with two helper views:

- `CLIMATE.drivers` – canonical baseline and refinement driver blocks mirroring the resolved `climateBaseline` and `climateRefine` groups.
- `CLIMATE.moistureAdjustments` – targeted adjustments consumed by rainfall layers and narrative overlays. It includes baseline coastal/orographic noise, refinement gradients, and story-scale rainfall deltas (hotspots, rifts, paleo motifs, etc.).

`layers/climate-baseline.js`, `layers/climate-refinement.js`, and story overlays reference these shared primitives instead of touching the raw config groups directly. The climate overlays remain conservative, but the shared primitives make it easier to compose new moisture effects without duplicating normalization logic.

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
