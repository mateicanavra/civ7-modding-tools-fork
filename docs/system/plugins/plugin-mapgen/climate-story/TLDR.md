# Climate Story TL;DR

What
- Narrative Imprint Layer = sparse “StoryTags” that hint at tectonics/volcanism/rifts/glaciation—without heavy simulation.
- We bias existing passes (coasts, islands, rainfall Phase B, biome nudges) with tiny, clamped adjustments.
- Keep performance O(width × height), radii ≤ 4, lanes open, features validated, rainfall in [0, 200].

First Targets (v0.1)
- Hotspot Trails (deep‑ocean island chains with decaying density).
- Rift Valleys (linear inland lakes + mild humidity belt + greener shoulders).

Minimum Integration Points
- Tagging runs after landmasses/coasts exist; before Climate Phase A.
- addIslandChains: read HOTSPOT_TRAIL tags to bias island spawning (strict spacing + lane checks).
- refineRainfallEarthlike: add small rift humidity near RIFT_LINE (clamped).
- designateEnhancedBiomes: prefer grassland/forest on RIFT_SHOULDER when rainfall allows.

Hard Guardrails
- Never narrow sea lanes below acceptance width.
- Clamp rainfall after every change [0, 200].
- Validate features via engine checks; resolve via lookups; skip if not allowed.
- Keep lake conversions tiny, far from starts; cap motif counts and enforce separation.
- Diminishing returns when multiple StoryTags stack on one tile.

Default Tunables (good starting values)
- Hotspot Trails:
  - maxTrails=3, length=10 steps, step=4 tiles
  - decayStart=0.5, decayRate=0.85
  - minDistanceFromLand=4, minTrailSeparation=12
  - clusterSize=1..2, respect minSeaLaneWidth
- Rift Valleys:
  - maxRiftsPerContinent=2, minContinentArea≈4% map
  - lineLength=18 steps, step=2 tiles
  - riftLakeDensity=0.2, riftMaxLakeTilesPerContinent=10
  - riftHumidityBoost=+8, radius=2
  - shoulderWidth=1, minDistanceFromStarts=8, riftMinSeparation=12

Quick‑Start Checklist (30–60 min)
1) Scaffolding (no behavior change yet)
   - Add StoryTags structure: tags.hotspot (sparse set), tags.riftLine (set), tags.riftShoulder (set).
   - Add toggles: STORY_ENABLE_HOTSPOTS, STORY_ENABLE_RIFTS (default true).
   - Add logs: “Drawing hotspot trails…”, “Marking rift lines and basins…”.

2) Hotspot Trails (tagging)
   - Pick ≤3 deep‑ocean seeds far from land and each other (≥12).
   - March 10 steps at 4‑tile increments with low‑freq bend; compute strength = 0.5 × 0.85^i.
   - Tag HOTSPOT_TRAIL points if deep ocean and ≥4 from land.

3) Hotspot Integration (islands)
   - In addIslandChains: when near HOTSPOT_TRAIL, bump island chance by f(strength); cap islands per trail; enforce spacing and min sea‑lane width; limit cluster size (1–2).

4) Rift Valleys (tagging + micro‑lakes)
   - For each large continent (≥4% tiles), choose ≤2 long axes avoiding high mountains.
   - March 18 steps at 2‑tile increments; tag RIFT_LINE; tag 1‑tile RIFT_SHOULDER on both sides (land only).
   - Convert a few lowland RIFT_LINE tiles to 1‑tile lakes with probability 0.2, honoring caps, start distance (≥8), and adjacency sanity.

5) Rift Integration (rainfall + biomes)
   - refineRainfallEarthlike: +8 rainfall within radius 2 of RIFT_LINE; reduce with elevation; clamp.
   - designateEnhancedBiomes: on RIFT_SHOULDER, prefer grassland/forest if rainfall/latitude allow (no overrides; just bias).

6) Safeguards + Diminishing Returns
   - If multiple tags touch the same tile, apply largest delta fully, then 50% of the next, 25% of the next, clamp.
   - Keep global counters: trail islands, rift lakes; stop when caps hit.

7) Diagnostics
   - Print counts: trails, trail points, islands realized; rifts per continent, lake tiles placed.
   - Optional overlay dumps behind dev flag.

Acceptance (must pass)
- Oceans: lanes remain robust; hotspot islands form sparse aligned chains, no bridges.
- Interiors: rift lake chains read as long linear features; mild greener shoulders, not dominant.
- Rainfall: histograms ~baseline; local deviations small; all adjustments clamped.
- Starts: no intrusive lakes/fertility near spawns; base balance intact.

Next up (later, separate small PRs)
- Margins (active/passive): fjord/trench vs. shelf/reef bias (very sparse; strict lane checks).
- Orogeny belts: narrow windward +lee amplification using existing orographic logic.
- Paleo‑hydrology: ≤4 deltas, ≤6 oxbows, ≤3 fossil channels (humidity/biome hints only).
- Glacial fingerprints: fjord bias at high latitudes, ≤10 kettle lakes, taiga emphasis where wet enough.

Reminder
- Update DESIGN.md changelog when enabling knobs.
- Keep JSON/phase logs minimal, focused on counts and caps hit.

— End TL;DR —