# Gameplay Domain — Stage/Step Inventory (Current State)

This inventory is the repo-specific “what exists today” snapshot that the Gameplay-domain refactor must respect.

Primary source (more detail and narrative): `docs/projects/engine-refactor-v1/resources/spike/spike-gameplay-domain-refactor-plan-notes.md`

## Standard Recipe Stage Order (Braid)

Source: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

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

## Gameplay-Shaped Stages (Narrative)

```yaml
stages:
  - id: narrative-pre
    dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre
    artifacts: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts
    steps:
      - id: story-seed
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.ts
      - id: story-hotspots
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.ts
      - id: story-rifts
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.ts
      - id: story-corridors-pre
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.ts

  - id: narrative-mid
    dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid
    steps:
      - id: story-orogeny
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.ts

  - id: narrative-swatches
    dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches
    steps:
      - id: story-swatches
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts

  - id: narrative-post
    dir: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post
    steps:
      - id: story-corridors-post
        contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts
        impl: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.ts
```

## Gameplay-Shaped Stage (Placement)

```yaml
stage:
  id: placement
  dir: mods/mod-swooper-maps/src/recipes/standard/stages/placement
  artifacts: mods/mod-swooper-maps/src/recipes/standard/stages/placement/artifacts.ts
  steps:
    - id: derive-placement-inputs
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/index.ts
    - id: placement
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/index.ts
      engine_apply_boundary: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
```

## Cross-Pipeline Overlay Consumers (Current State)

This is the “who reads story overlays” map that makes gameplay outputs real.

```yaml
overlay_consumers:
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts
    reads: [motifs.margins, corridors]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
    reads: [motifs.margins, motifs.hotspots, corridors]
    notes: "Also publishes HOTSPOTS overlays (boundary wrinkle)."
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts
    reads: [motifs.rifts, motifs.hotspots]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts
    reads: [corridors, motifs.rifts]
  - step: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts
    reads: [motifs.hotspots, motifs.margins]
```

