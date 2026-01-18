# Spike: Narrative overlays — load-bearing inventory (Swooper Maps)

Goal: assess whether the remaining “narrative” overlays (corridors, margins, hotspots, rifts, orogeny) can be removed, or whether they are currently structurally load-bearing in the standard recipe pipeline.

This spike is scoped to the TypeScript Swooper Maps standard recipe and its consumers (not legacy JS, and not Civ7 gameplay tags).

## Quick conclusion

- `narrative-pre` is currently **structurally load-bearing** because multiple downstream stages consume its overlays to steer morphology and ecology.
- `narrative-mid` (`orogeny`) appears **not load-bearing today** (no downstream consumers found beyond publication), so it is a strong candidate for removal if the project’s goal is “no narrative overlays”.

## What still exists (after removing narrative-post)

### Remaining standard recipe stages

- `narrative-pre`: publishes overlays for `margins`, `hotspots`, `rifts`, `corridors`.
- `narrative-mid`: publishes overlays for `orogeny`.

Entry points:
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/index.ts`

### Overlay keys

Overlay keys are defined in:
- `mods/mod-swooper-maps/src/domain/narrative/overlays/keys.ts`

Keys:
- `margins`
- `hotspots`
- `rifts`
- `orogeny`
- `corridors`

### Overlay read contract (consumer-facing)

Overlay decoding helpers live in:
- `mods/mod-swooper-maps/src/recipes/standard/overlays.ts`

Helpers:
- `readOverlayMotifsMargins` → `activeMargin`, `passiveShelf`
- `readOverlayMotifsHotspots` → `points`, `paradise`, `volcanic`, `trails`
- `readOverlayMotifsRifts` → `riftLine`, `riftShoulder`
- `readOverlayCorridors` → `seaLanes`, `islandHops`, `landCorridors`, plus per-tile metadata maps

## Where each narrative overlay comes from

- `margins`: `storySeed` → `storyTagContinentalMargins(...)`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/margins.ts`

- `hotspots`: `storyHotspots` → `storyTagHotspotTrails(...)`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/hotspots.ts`

- `rifts`: `storyRifts` → `storyTagRiftValleys(...)`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts`

- `corridors`: `storyCorridorsPre` → `storyTagStrategicCorridors(...)` (stage `preIslands`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/corridors/index.ts`

- `orogeny`: `storyOrogeny` → `storyTagOrogenyBelts(...)`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/orogeny/belts.ts`

## Downstream consumers (load-bearing map)

This section is the key “is it load-bearing?” inventory.

### Morphology: coasts (consumes margins + corridors)

- `morphology-mid/ruggedCoasts`
  - Reads `margins` (`activeMarginMask`, `passiveShelfMask`) and `corridors` (`seaLaneMask`)
  - Uses those masks to steer `ops.coastlines(...)`
  - File: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`

Impact if removed:
- Without replacement masks, coastline planning becomes under-specified (or must drop those steering parameters).

### Morphology: islands (consumes margins + corridors + hotspots)

- `morphology-post/islands`
  - Reads `margins` + `corridors` + `hotspots`
  - Feeds masks into `ops.islands(...)` planning
  - File: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`

Impact if removed:
- Island chain planning would either need replacement signals (physics artifacts) or a redesign to remove these steering knobs.

### Morphology: volcanoes (consumes hotspots)

- `morphology-post/volcanoes`
  - Reads `hotspots` and uses it to build a `hotspotMask` for `ops.volcanoes(...)`
  - File: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`

Impact if removed:
- Volcano planning loses its primary targeting signal (must use a physics-derived volcanic potential or plate boundary signal instead).

### Ecology: features (consumes margins + hotspots)

- `ecology/features`
  - Reads overlays and passes motifs through as inputs into feature planning
  - File: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

Concrete consumers:
- Reef embellishments use `margins.passiveShelf` → `passiveShelfMask`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`
- Vegetation embellishments use `hotspots.volcanic` → `volcanicMask`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`

Impact if removed:
- Reef/vegetation embellishment planning must either drop these biases or be rewritten to use physics-derived signals.

### Narrative: corridors depends on rifts (rifts is indirectly load-bearing)

- `narrative/corridors` uses `rifts.riftShoulder` to seed land corridors
  - File: `mods/mod-swooper-maps/src/domain/narrative/corridors/index.ts`

Impact if removed:
- `rifts` can be removed only if the corridor system removes or replaces its rift-driven land-corridor pass.

### Orogeny (appears unused downstream)

- No downstream consumers were found in the standard recipe stages (beyond publishing the overlay and the generic overlay registry plumbing).
- If this is correct, `narrative-mid` (and the `orogeny` overlay) is likely removable without structural fallout.

## Removability matrix (today)

“Removable” here means “can delete without also having to refactor other stages/ops”.

- `orogeny` (`narrative-mid`): likely removable now (no consumers found)
- `rifts`: not removable without also changing `corridors` (rifts seed land corridors)
- `corridors`: not removable without refactoring morphology consumers (`ruggedCoasts`, `islands`)
- `margins`: not removable without refactoring morphology + ecology consumers (`ruggedCoasts`, `islands`, `features`)
- `hotspots`: not removable without refactoring morphology + ecology consumers (`islands`, `volcanoes`, `features`)

## Notes for a “physics-only” future (direction, not a plan)

If the project’s design goal is “no authored narrative thumbs on the scale”, the consumers above would need replacement inputs sourced from canonical artifacts (Foundation/Morphology/Hydrology):

- Replace `margins/passiveShelf` with a physics-derived “shelf” metric (bathymetry / coastal depth / slope) rather than authored motif tagging.
- Replace `seaLanes` with a physics-derived “navigation corridor” heuristic from landmask + channel width metrics (still a heuristic, but derived from geometry not story tags).
- Replace `hotspots/volcanic` with a physics-derived volcanic potential (plates boundary type/closeness, stress/uplift, or separate volcanic field).
- Replace any corridor land-biasing from `rifts` with plate/terrain-derived mobility constraints if still desired.

