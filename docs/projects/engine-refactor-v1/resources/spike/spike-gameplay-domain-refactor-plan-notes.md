# Gameplay Domain Refactor — Plan Notes + Repo Wiring Inventory

This is the **project-scoped** companion to the system-level evidence spike:
- Canonical evidence (design-level, low churn): `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md`

This document is allowed to be **repo-specific**: it captures where “gameplay mapgen” concerns live today (stages, step contracts, adapter APIs) so we can plan a consolidated Gameplay domain refactor without muddying system docs.

## Current in-repo wiring (what we actually call today)

### Placement stage (engine-facing “apply”)

- The placement “apply” step calls Civ7 engine placement APIs (via adapter):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`

This is the strongest current anchor for what a “gameplay application boundary” looks like in the pipeline today.

### Placement domain (planning ops used by the stage)

- Placement ops are already “domain-shaped” planning units used upstream of `apply`:
  - `mods/mod-swooper-maps/src/domain/placement/ops/*`
  - (notably used by placement stage input-derivation steps, e.g. “derive placement inputs”)

### Narrative stages (gameplay-oriented, overlay-shaped outputs)

Narrative is already producing “story” artifacts/overlays that downstream consumers read:
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts`

Ecology consumes these narrative outputs (evidence: step contracts under `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts` reference narrative artifacts).

**Implication:** a merged Gameplay domain plausibly pulls in “narrative overlay production” as a first-class gameplay output surface (even if the stage braid remains).

## Adapter surface (what’s explicitly supported by the Civ7 bridge)

The adapter already exposes the key base-standard script entrypoints for gameplay mapgen concerns (starts/resources/discoveries/wonders/fertility, etc.):
- `packages/civ7-adapter/src/types.ts` (`EngineAdapter`)

This gives the Gameplay domain a clean “engine boundary” to hang gameplay application steps on, without letting steps import base-standard scripts directly.

## SDK authoring surfaces (data-driven gameplay tuning)

The SDK already contains authoring nodes for start-bias tables (data-driven knobs that impact mapgen-time start placement):
- `packages/sdk/src/nodes/StartBias*Node.ts`

This is evidence that “gameplay at mapgen time” includes both:
- **runtime map scripts** (engine-side map generation)
- **data-driven tuning tables** (modded via SDK/data pipeline)

## Planned next deepening (inventory targets)

If we proceed to “one level deeper”, the concrete deliverable to produce is a gameplay refactor inventory:
- Exact list of **which narrative-* stages/steps** become gameplay-owned (corridors/swatches/motifs/story overlays), and which remain physics-domain-owned.
- Exact list of **which placement stage steps** become gameplay-owned (inputs planning + apply).
- Artifact/overlay contract map for gameplay outputs that downstream domains consume.

Open question to answer with evidence:
- Which additional Civ7 gameplay levers exist in official scripts that we do **not** currently expose via `EngineAdapter` (e.g., script-level APIs that are present but not wrapped yet), and whether they belong in the gameplay domain refactor scope.

---

## Deep inventory (one level deeper)

This section turns the “planned next deepening” bullets into an **evidence-backed inventory** of what a merged Gameplay domain would likely absorb (and what it would need to keep interoperating with).

### 1) Where the gameplay-shaped stages live today (recipe order)

The standard recipe stage braid (source of truth for ordering):
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

```yaml
stages_in_order:
  - foundation
  - morphology-pre
  - narrative-pre
  - morphology-mid
  - narrative-mid
  - morphology-post
  - hydrology-pre
  - narrative-swatches
  - hydrology-core
  - narrative-post
  - hydrology-post
  - ecology
  - placement
```

**Implication:** “gameplay” (as narrative + placement) is not one contiguous stage today; it is **interleaved** with morphology and hydrology.

### 2) Narrative stages + steps (overlay production)

Narrative’s explicit stage footprints:

```yaml
stages:
  - id: narrative-pre
    stage_dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre
    stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/index.ts
    artifacts_module: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts
    artifacts:
      - name: overlays
        id: artifact:storyOverlays
        notes: "Single shared overlays container (corridors/swatches/motifs arrays; additionalProperties allowed)."
    steps:
      - id: story-seed
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.ts
        artifacts:
          provides: [overlays]
        notes: "Implements/publishes overlays once via `deps.artifacts.overlays.publish(ctx, ctx.overlays)` (establishes the shared container)."
      - id: story-hotspots
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.ts
        artifacts:
          requires: [overlays]
        notes: "Appends HOTSPOTS overlay snapshots into `ctx.overlays` via narrative tagging utilities."
      - id: story-rifts
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.ts
        artifacts:
          requires: [foundationPlates, overlays]
        notes: "Appends RIFTS overlays; depends on Foundation plate fields."
      - id: story-corridors-pre
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.ts
        artifacts:
          requires: [overlays]
        notes: "Computes pre-islands corridors from prior motifs (hotspots + rifts)."

  - id: narrative-mid
    stage_dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid
    stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/index.ts
    steps:
      - id: story-orogeny
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.ts
        artifacts:
          requires: [foundationPlates, foundationDynamics, overlays]
        notes: "Appends OROGENY overlay snapshots; depends on Foundation plates + dynamics."

  - id: narrative-swatches
    stage_dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches
    stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/index.ts
    steps:
      - id: story-swatches
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts
        artifacts:
          requires: [heightfield, climateField, foundationDynamics, overlays]
        notes: "Appends SWATCHES + PALEO overlays (climate-informed) when enabled."

  - id: narrative-post
    stage_dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post
    stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/index.ts
    steps:
      - id: story-corridors-post
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.ts
        artifacts:
          requires: [overlays, riverAdjacency]
        notes: "Post-rivers corridor pass; appends another CORRIDORS snapshot keyed to the `postRivers` stage."
```

**Important nuance:** narrative stages are “gameplay-shaped”, but their steps **depend on physics artifacts** (Foundation plates/dynamics; Hydrology riverAdjacency; Hydrology Pre buffers-as-artifacts).

### 3) Placement stage + steps (board setup + content placement)

Placement’s explicit stage footprint:

```yaml
stage:
  id: placement
  stage_dir: mods/mod-swooper-maps/src/recipes/standard/stages/placement
  stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/placement/index.ts
  artifacts_module: mods/mod-swooper-maps/src/recipes/standard/stages/placement/artifacts.ts
  artifacts:
    - name: placementInputs
      id: artifact:placementInputs
      schema: mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-inputs.ts
    - name: placementOutputs
      id: artifact:placementOutputs
      schema: mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-outputs.ts
  steps:
    - id: derive-placement-inputs
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/index.ts
      artifacts:
        provides: [placementInputs]
      ops:
        - "@mapgen/domain/placement ops: planWonders, planFloodplains, planStarts"
      notes: "Derives placementInputs (plans) from runtime mapInfo + baseStarts."
    - id: placement
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/index.ts
      artifacts:
        requires: [placementInputs]
        provides: [placementOutputs]
      notes: "Applies engine-side placement (wonders/resources/starts/discoveries/etc) via adapter."
```

The engine-facing apply boundary:
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`

### 4) Cross-pipeline overlay consumers (who reads gameplay “story”)

The overlays container is produced/published in `narrative-pre`, then **read across multiple later stages**:

```yaml
overlay_consumers:
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts
    reads: [motifs.margins, corridors]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
    reads: [motifs.margins, motifs.hotspots, corridors]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts
    reads: [motifs.rifts, motifs.hotspots]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts
    reads: [corridors, motifs.rifts]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts
    reads: [motifs.hotspots, motifs.margins]
```

**Notable wrinkle:** at least one **non-narrative** step also publishes a story overlay:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts` publishes `STORY_OVERLAY_KEYS.HOTSPOTS` after island-chain shaping.

This supports the “overlays are append-preferred, cross-domain, story-shaped outputs” stance: overlay production is not strictly confined to narrative stages today.

### 5) Civ7 scripts vs adapter vs current mod usage (capability matrix)

This is the concrete “what exists” map that a Gameplay domain refactor would need to respect.

**Note on evidence gathering:** the `.civ7/outputs/**` tree is typically ignored by default search tooling (gitignore). When scanning these files, use `rg --no-ignore` to avoid false negatives.

#### A) Canonical “gameplay mapgen” entrypoints (official scripts) and adapter coverage

```yaml
official_entrypoints:
  - concern: "natural wonders"
    official: .civ7/outputs/resources/Base/modules/base-standard/maps/natural-wonder-generator.js
    exports: [addNaturalWonders]
    adapter_support:
      method: EngineAdapter.addNaturalWonders
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts

  - concern: "resources (bulk generation)"
    official: .civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js
    exports: [generateResources, canHaveFlowerPlot, getFlowerPlot]
    adapter_support:
      method: EngineAdapter.generateResources
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts

  - concern: "discoveries"
    official: .civ7/outputs/resources/Base/modules/base-standard/maps/discovery-generator.js
    exports: [generateDiscoveries]
    adapter_support:
      method: EngineAdapter.generateDiscoveries
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts

  - concern: "start positions (major players)"
    official: .civ7/outputs/resources/Base/modules/base-standard/maps/assign-starting-plots.js
    exports:
      - chooseStartSectors
      - assignStartPositions
      - assignSingleContinentStartPositions
      - assignStartPositionsFromTiles
    adapter_support:
      methods:
        - EngineAdapter.assignStartPositions
        - EngineAdapter.chooseStartSectors
        - EngineAdapter.needHumanNearEquator
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
      notes: "The mod currently calls `assignStartPositions(...)`; it does not call `chooseStartSectors(...)` directly."

  - concern: "advanced start regions"
    official: .civ7/outputs/resources/Base/modules/base-standard/maps/assign-advanced-start-region.js
    exports: [assignAdvancedStartRegions]
    adapter_support:
      method: EngineAdapter.assignAdvancedStartRegions
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts

  - concern: "floodplains (river post-processing)"
    official_examples:
      - .civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js
      - .civ7/outputs/resources/Base/modules/base-standard/maps/continents.js
      - .civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js
    evidence: "Each map script calls `TerrainBuilder.addFloodplains(4, 10)` as part of the standard sequence."
    adapter_support:
      method: EngineAdapter.addFloodplains
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts

  - concern: "fertility (board scoring inputs)"
    official_examples:
      - .civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js
      - .civ7/outputs/resources/Base/modules/base-standard/maps/continents.js
    evidence: "Map scripts call `FertilityBuilder.recalculate()` after terrain/features/resources/starts."
    adapter_support:
      method: EngineAdapter.recalculateFertility
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts

  - concern: "water data (board scoring inputs)"
    official_examples:
      - .civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js
    evidence: "Map scripts call `TerrainBuilder.storeWaterData()`."
    adapter_support:
      method: EngineAdapter.storeWaterData
      evidence: packages/civ7-adapter/src/types.ts
    mod_usage:
      callsite: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
```

#### B) Notable “exists in scripts, not a first-class adapter capability” levers

These are the clearest “outside-the-box but real” gameplay-ish hooks visible in `base-standard` scripts, which are not yet modeled as adapter-level capabilities in our SDK:

```yaml
capability_gaps:
  - concern: "direct resource placement"
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js uses ResourceBuilder.setResourceType(...)"
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js uses ResourceBuilder.setResourceType(...)"
    notes: "Today we treat resources as engine-owned bulk generation (`generateResources`). A Gameplay domain refactor could eventually want explicit, rule-driven resource placement, which would require adapter surface expansion."

  - concern: "map-type conditional resource post-processing"
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js consults `Configuration.getMapValue(\"Name\")` and `GameInfo.MapIslandBehavior`, then calls `replaceIslandResources(...)`"
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js defines `replaceIslandResources(iWidth, iHeight, zResourceClassType)`"
    notes: "This is a real gameplay-oriented lever (e.g., treasure resources on island maps) that is currently only reachable by delegating to the full `generateResources(...)` routine. If we want to make it an explicit, authored behavior, it likely needs a dedicated adapter/SDK surface."

  - concern: "start position scoring internals"
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/assign-starting-plots.js uses StartPositioner.getStartPositionScore(...) and related helpers"
    notes: "We currently consume starts as a black-box engine capability (`assignStartPositions`). Fine for now; exposing scoring knobs would be an explicit adapter/API decision."

  - concern: "discovery placement primitives"
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/discovery-generator.js places via MapConstructibles.addDiscovery(...)"
    notes: "Adapter currently wraps the full `generateDiscoveries(...)` routine; custom discovery placement would require exposing lower-level hooks."
```

#### C) “What I did not find” (broader scan, confirmed)

Using `rg --no-ignore` across `.civ7/outputs/resources/Base/modules/base-standard/maps/*.js`, I still did not find mapgen-time logic for:
- barbarians / barbarian camps
- city-states / minor civs / independent factions

The only “camp” hit was in discovery visuals (`\"Campfire\"`), not unit/camp placement logic.
