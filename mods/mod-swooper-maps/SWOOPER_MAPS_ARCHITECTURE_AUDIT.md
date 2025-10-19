# Swooper Maps Architecture Audit _(Superseded)_

> **Note**: This document is kept for historical context. The current roadmap and refactor plan live in `ENGINE_REFACTOR_PLAN.md`. Refer to that plan for up-to-date stage sequencing, data products, and deliverables.
>
> **Foundation consolidation**: The `worldModel` + `landmass` configuration discussed below has been superseded by the unified `foundation` block documented in `ENGINE_REFACTOR_PLAN.md` and `DESIGN.md`. Treat any references to the legacy config schema as historical only; new work should rely on the `foundation` structure and associated tunables.

## 1. Layer Stack and Shared State

| Stage | Modules | Responsibilities | Primary Inputs | Outputs / Shared State |
| --- | --- | --- | --- | --- |
| Bootstrap & Context | `swooper-desert-mountains.js`, `bootstrap/entry.js`, `bootstrap/resolved.js`, `bootstrap/tunables.js`, `core/types.js`, `core/adapters.js` | Compose defaults + presets + overrides, expose live tunables, create `MapContext` with `CivEngineAdapter` and attach `WorldModel` when enabled. | Map presets, runtime overrides, `BASE_CONFIG`, engine globals. | Live bindings in `tunables`, `MapContext` instance, optional `WorldModel` arrays, Story toggles. |
| Landmass Selection | `map_orchestrator.js`, `layers/landmass_plate.js`, `layers/landmass_utils.js` | Derive landmass windows from plate stability, apply plate-aware ocean separation and geometry post adjustments. | `LANDMASS_CFG`, `LANDMASS_GEOMETRY`, `WorldModel` boundary fields, `ctx`. | Terrain baseline (`GameplayMap`/adapter updates), landmass window metadata for start sectors, landmass ASCII snapshot. |
| Coast & Margin Imprint | `map_orchestrator.js`, `story/tagging.js`, `story/tags.js`, `story/corridors.js`, `layers/coastlines.js`, `layers/islands.js` | Expand coasts, tag margins, apply corridor presets, ruggedize coastlines with corridor & boundary awareness, seed islands respecting StoryTags. | `StoryTags`, `COASTLINES_CFG`, `CORRIDORS_CFG`, `MARGINS_CFG`, `WorldModel` boundary arrays, `ctx`. | Updated terrain/coast features, StoryTag sets for active/passive margins, corridors, hotspot/rift traces. |
| Orogeny & Magmatism | `layers/mountains.js`, `layers/volcanoes.js`, `world/model.js` | Place mountains/hills via WorldModel uplift/boundaries with fractal fallback, depress rifts, weight volcano candidates by boundary type & shield stability. | `MOUNTAINS_CFG`, `VOLCANOES_CFG`, `WorldModel` arrays, `ctx`. | Mountain/hill terrain, volcano features, boundary metrics logs, relief ASCII snapshot. |
| Hydrology & Climate | `elevation-terrain-generator.js` (base), `layers/climate-engine.js`, `story/tagging.js` (swatches, paleo), `map_orchestrator.js` | Generate lakes, baseline rainfall (latitude/orographic/coastal), apply climate swatches & paleo tags, model rivers, refine rainfall with water gradients, orographic lee, corridor & rift microclimates, wind direction. | `CLIMATE_CFG`, `STORY_TUNABLES`, `FOUNDATION_DIRECTIONALITY`, StoryTags, `ctx`. | Rainfall field updates, additional StoryTags (swatches, paleo), corridor ASCII overlays/logs, rainfall ASCII buckets. |
| Biomes & Features | `layers/biomes.js`, `layers/features.js`, `StoryTags`, `tunables` | Re-run vanilla biomes then bias tundra/tropical/river corridors, apply corridor styles, add reefs/vegetation near hotspots & margins with validation. | `BIOMES_CFG`, `FEATURES_DENSITY_CFG`, StoryTag sets, `ctx`. | Biome assignments, feature placements keyed to StoryTags, biome ASCII snapshot. |
| Placement & Finalization | `layers/placement.js`, `map_orchestrator.js` | Run final placement pass (wonders, resources, starts), recalc areas, validate terrain, log rainfall histograms & corridor overlays. | `PLACEMENT_CFG`, map info, previously generated StoryTags, `ctx`. | Final gameplay map surfaces, diagnostic metrics (timings, histograms), `startPositions`. |

**Shared State Pathways**
- `MapContext.adapter` mediates most terrain/feature writes in refactored layers; some legacy calls still use `GameplayMap` directly (e.g., story tagging, base-standard helpers), creating a hybrid access pattern.
- `StoryTags` is mutated across stages: margins are tagged, reset, and re-applied before/after coasts and rivers, so downstream layers rely on the most recent pass.
- `WorldModel` powers landmass separation, coasts, mountains, volcanoes, climate refinement, and corridor directionality; every run initializes its plate tensors and exposes them through the shared context.
- Tunables in `tunables.js` expose frozen group objects; consumers treat them as read-only snapshots for the active generation run.

## 2. Orchestration Pain Points

1. **Config ambiguity around moisture & dryness** — Climate baseline bands, refinement water/orographic deltas, Story swatches, and microclimate rainfall knobs all compete to influence humidity without a unified desert/aridity concept. Builders must tweak multiple groups (`climate.baseline`, `climate.refine`, `story.swatches`, `microclimate.rainfall`) to get predictable deserts. Swatch options split `drynessDelta` vs. `dryDelta`, while rain shadows hard-code subtractions.
2. **Implicit ordering and state resets** — `StoryTags.reset()` happens before and after coast shaping and again after rivers; the orchestrator hard-codes when each tagging function should run, but config does not expose stage ordering. Consumers must read the orchestrator to understand when swatches or corridors fire.
3. **Mixed adapter usage** — Refactored layers accept `MapContext`, yet story tagging, swatches, and corridor tagging still use `GameplayMap` globals. This split complicates future testing and makes it harder to reason about which state mutations bypass context.
4. **Preset vs. override tension** — Presets like `voronoi` toggle WorldModel and geometry, but entries still override the same values. There's no schema-level declaration tying a preset to a stage (e.g., "this preset supplies `landmass.geometry`").
5. **Story layers leak into mechanical passes** — Corridor tagging drives coastlines, biomes, and features through shared StoryTags. Without explicit dependency declarations, it is easy to add a new corridor style that conflicts with coast protection or biome bias.
6. **Diagnostics entwined with gameplay order** — Dev logging lives in the orchestrator, but toggles are global. For example, rainfall histograms run after features regardless of whether climate tuning changed, and corridor ASCII overlays run twice (pre- and post-rivers) without exposing stage timings in config.

## 3. Proposed Orchestration & Config Model

1. **Stage-first orchestration manifest** — Introduce a declarative `stages` array (e.g., in `map_config.types` or a new `orchestration` block) that lists enabled stages and their order (`worldModel`, `landmass`, `coast`, `storySeed`, `relief`, `hydrology`, `climate`, `biome`, `features`, `placement`). The orchestrator should loop this manifest instead of hard-coded calls, letting presets select or skip stages explicitly and encode the Voronoi-first -> plate-mask fallback so the retired band generator cannot silently return.
2. **Separate foundational vs. narrative config** — Split current `story` and `microclimate` knobs into (a) **Climate Drivers** (baseline bands, pressure cells, aridity controls) and (b) **Narrative Overlays** (swatches, paleo, corridors). Ensure dryness controls live in the climate driver group with additive deltas referenced by overlays.
3. **Unify moisture schema** — Replace `drynessDelta`, `dryDelta`, and implicit lee subtractions with a shared `moistureAdjustments` schema (`{ target: "desert" | "rainbelt" | ... , magnitude, radius, elevationBias }`). Climate baseline would consume global defaults; swatches would just add entries to the adjustment set.
4. **Context-only surface** — Migrate remaining story/tagging passes onto `MapContext.adapter` and store StoryTags inside `ctx` so every pass consumes the same state object. This enables instrumentation and testing without engine globals.
5. **Preset capabilities** — Let presets declare which stage groups they configure (e.g., `presets.voronoi.stages = { worldModel: true, landmass: "plates" }`). The resolver can warn when an override touches a stage that is disabled or missing dependencies.
6. **Config-driven diagnostics** — Add a `diagnostics` group that allows presets to request histogram/log timing per stage. The orchestrator would honor the stage manifest when running logs, keeping metrics in `ctx.metrics` for later reporting.

## 4. Tunable Surface Audit & Gaps

| Group | Current Purpose | Pain / Gap | Recommendation |
| --- | --- | --- | --- |
| `toggles` | Master Story/WorldModel switches. | Lacks link to stage manifest; toggles may be inconsistent with preset stage choices. | Fold into stage manifest so disabling a stage removes dependent layers automatically. |
| `story` (`hotspot`, `rift`, `orogeny`, `swatches`, `paleo`) | Narrative overlays that tag StoryTags. | Swatches double-encode moisture (`drynessDelta` vs `dryDelta`); paleo mixes humidity boosts with canyon dryness. | Convert to overlay descriptors referencing shared moisture/terrain primitives; split paleo humidity vs. terrain carving. |
| `microclimate` | Rainfall & feature deltas tied to StoryTags. | Overlaps with climate refinement (both adjust rainfall near rifts/hotspots). | Move rainfall effects into climate refinement stage inputs; keep feature probabilities in a `features.hotspot` namespace. |
| `landmass` / `geometry` | Controls for ocean width, band layout, plate modes. | Geometry mode toggles live separately from stage enabling, and presets rely on runtime inference. | Add explicit `landmass.mode` enumeration in orchestration config; include dependencies (requires worldModel). |
| `coastlines`, `margins`, `islands` | Margin tagging, coast ruggedness, island spawning. | Corridor policy interacts indirectly; config cannot declare that a style reserves bays/fjords. | Let corridor styles specify coast allowances; coast layer reads style metadata rather than StoryTags only. |
| `climate.baseline` / `climate.refine` | Base rainfall and refinement deltas. | Many knobs hard-code assumptions (band weights, lee dryness) and lack explicit desert/steppe targets. | Introduce climate "profiles" (e.g., arid, humid, monsoon) with explicit dryness/precip thresholds; allow presets to select profile rather than tweaking numbers piecemeal. |
| `mountains`, `volcanoes` | Plate-aware relief tunables. | Already stage-aligned but missing guardrails about worldModel availability. | Validate at resolution time; warn if worldModel disabled while relief tunables specify plate weights. |
| `biomes`, `featuresDensity` | Gentle biome/feature biases. | Corridor bias config sits here but corridors defined elsewhere. | Move corridor-specific bias knobs under the corridor styles to keep concerns localized. |
| `corridors` | Sea/land/river lane policies and styles. | No explicit handshake with coast/biome layers; styles hold nested behavior but not staged enabling. | Allow stage manifest to reference corridor tags as dependencies; add validation that lanes exist before dependent stages run. |
| `placement`, `dev` | Final placement tweaks and logging toggles. | Dev flags are global booleans, not stage-aware. | Promote to `diagnostics` with per-stage logging controls. |
| `worldModel` | Plate, wind, current settings plus ocean separation policy. | Currently stored under `storyEnableWorldModel` toggle; ocean separation interacts with landmass geometry indirectly. | Move ocean separation controls under landmass stage config; keep worldModel focused on physical simulation parameters. |

Missing concepts:
- **Explicit desert/aridity controls** — No direct way to set target desert coverage or tie dryness to plate interiors without editing multiple groups.
- **River & basin policy** — Rivers still use base-engine parameters; corridor and paleo systems hint at adjustments but no config surface exposes them.
- **Validation thresholds** — No config for acceptable map metrics (water %, mountain %, start failures) despite logging stats.

## 5. Observability & Tooling Gaps

- **Stage metrics registry** — `dev.js` exposes timers and ASCII logs, but timings are stored as console output. Capturing them in `ctx.metrics.timings` would enable automated regression checks.
- **StoryTag & climate visualization** — Core diagnostics now emit ASCII grids for landmass windows, plate boundaries, relief, rainfall buckets, corridors, and biome outcomes. We still lack snapshots for swatches/paleo traces or rainfall deltas introduced by specific microclimate overlays; with the headless stub gone we need a FireTuner/CLI capture path (e.g., JSON dumps triggered by `DEV.LOG_*` toggles) to persist those arrays for validation.
- **Config validation** — Resolver merges configs but does not warn when stage dependencies are unsatisfied (e.g., enabling plate ocean separation without worldModel). Add schema validation hooks before `deepFreeze`.
- **Test harness** — No Vitest coverage around orchestration order or config resolution. A small suite asserting stage manifest compliance would catch regressions before game runtime.
- **Plan alignment** — Phase 2 in `PLATE_REFACTOR_PLAN.md` calls for auditing climate/coast consumers of WorldModel data; current mixed adapter usage makes that audit difficult without instrumentation.

## 6. Recommended Next Steps

1. Design the orchestration manifest schema and update `map_config.types.js` plus resolver to understand stage groupings.
2. Refactor the orchestrator to consume the manifest, migrating each stage call into dedicated handlers that accept `ctx` and stage config.
3. Normalize moisture controls by introducing climate profiles and migrating swatch/microclimate settings to the shared schema.
4. Port remaining StoryTag producers to use `MapContext.adapter` and store tags within `ctx` to remove global state.
5. Extend presets to declare stage participation; add resolver validation that warns when presets and overrides conflict with stage availability.
6. Build lightweight observability helpers that capture per-stage metrics into `ctx.metrics`, and surface CLI/FireTuner tooling to dump them now that headless output is gone, aligning with Phase 2/3 checkpoints in the refactor plan and supporting deterministic regression capture.
