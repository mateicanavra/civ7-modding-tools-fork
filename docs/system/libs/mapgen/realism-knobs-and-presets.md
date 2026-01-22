# Realism Knobs & Presets (Author Surface)

This doc describes the author-facing *semantic knobs* and *preset tiers* used by the MapGen standard recipe when targeting a “realism-first” posture.

The contract is:
- Advanced step config is always the baseline (schema-defaulted + authored overrides).
- Knobs apply **last** as deterministic transforms over that baseline (no presence-gating).

## Presets

Preset configs (intended as starting points; authors can layer knobs/advanced overrides on top):
- `mods/mod-swooper-maps/src/maps/presets/realism/earthlike.config.ts` (`realismEarthlikeConfig`)
- `mods/mod-swooper-maps/src/maps/presets/realism/young-tectonics.config.ts` (`realismYoungTectonicsConfig`)
- `mods/mod-swooper-maps/src/maps/presets/realism/old-erosion.config.ts` (`realismOldErosionConfig`)

## Knobs (by stage)

### `foundation.knobs`

- `plateCount`: `"sparse" | "normal" | "dense"`
  - Scales `computeMesh.config.plateCount` and `computePlateGraph.config.plateCount` deterministically.
- `plateActivity`: `"low" | "normal" | "high"`
  - Adjusts `computePlates.config.boundaryInfluenceDistance` and scales kinematics (`movementScale`, `rotationScale`).

### `morphology-pre.knobs`

- `seaLevel`: `"land-heavy" | "earthlike" | "water-heavy"`
  - Shifts `computeSeaLevel` hypsometry target (`targetWaterPercent`) deterministically.

### `morphology-mid.knobs`

- `erosion`: `"low" | "normal" | "high"`
  - Scales geomorphology rates (`fluvial.rate`, `diffusion.rate`, `deposition.rate`).
- `coastRuggedness`: `"smooth" | "normal" | "rugged"`
  - Scales bay/fjord carving weights (no topology changes; still wrapX-only).

### `morphology-post.knobs`

- `volcanism`: `"low" | "normal" | "high"`
  - Scales volcano plan density/weights deterministically.

### `map-morphology.knobs`

- `orogeny`: `"low" | "normal" | "high"`
  - Scales mountain planning intensity and nudges thresholds deterministically.

## Tests

The knobs-last contract is locked by:
- `mods/mod-swooper-maps/test/m11-config-knobs-and-presets.test.ts`

