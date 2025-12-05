# Hotspot Trails and Rift Valleys — First Iteration (v0.1)

Status: Proposed
Layer: Climate Story (Narrative Imprint)
Targets: Huge maps (compatible with v1.0.0 pipeline and guardrails)

Summary
- This document specifies the first two narrative motifs to “imprint history” onto the map without heavy simulation:
  - Hotspot Trails (deep-ocean volcanic chains)
  - Rift Valleys (continental interior rifting with long lakes and greener shoulders)
- Both motifs are implemented as sparse “StoryTags” that bias existing passes (islands, climate refinements, biome nudges) without breaking compatibility or performance constraints.


1) Design Goals

- Readable Story Signals:
  - Hotspot Trails: aligned island/seamount chains with decaying activity.
  - Rift Valleys: linear lake chains, slightly greener shoulders, subtle humidity belt.
- Composable and Safe:
  - Use O(width × height) scans with small local radii (≤ 4).
  - Never reduce sea-lane widths below acceptance criteria.
  - Keep rainfall within [0, 200]; validate all features against engine rules.
- Compatibility-First:
  - Integrate with addIslandChains, refineRainfallEarthlike, and designateEnhancedBiomes.
  - Avoid altering base elevation generation or reintroducing aggressive cliffs/mountain amplification.


2) Shared Infrastructure

2.1 StoryTags data model (transient)
- Represent per-tile tags in small parallel 2D arrays or sparse sets of coordinates:
  - HOTSPOT_TRAIL: boolean or small int for strength/age index.
  - RIFT_LINE: boolean for the rift centerline.
  - RIFT_SHOULDER: boolean or small int (0..2) for lateral shoulder tiles near the line.
  - RIFT_LAKE_CANDIDATE: boolean (subset of RIFT_LINE positions).
- Optional sparse polyline representation for each motif for diagnostics and easier iteration.

2.2 Randomness and determinism
- Use the generator’s seed and derive stable sub-seeds per motif:
  - seed_hotspot, seed_rift
- This ensures reproducible placement conditioned on the global map seed.

2.3 Performance
- Construction of tags must be single-pass/sparse:
  - Hotspot Trails: pick a handful (≤ 3) of deep-ocean polylines; compute points via incremental stepping; write tags; done.
  - Rift Valleys: 1–2 lines per large continent; project a small number of tiles; done.
- Integration reads tags locally (e.g., in addIslandChains or refineRainfallEarthlike) without any global heavy work.


3) Motif A — Hotspot Trails

3.1 Narrative intent
- Emulate mantle hotspots forming linear chains of islands/seamounts moving with plate drift. The visual cue: a sparse, gently curving line of small islands across deep ocean, with spacing and decaying density along the chain.

3.2 Visual targets
- 2–3 trails on Huge.
- 3–6 island placements per trail, spaced generously, with 1–3 tile clusters at most.
- Avoid creating bridges or chokepoints. Keep lanes robust.

3.3 Tunables
- maxHotspotTrails (map): 3
- hotspotTrailLength (steps): 8–14
- hotspotTrailStep (tiles between points): 3–6
- hotspotTrailDecayStart: 0.4 (probability)
- hotspotTrailDecayRate: 0.8 per subsequent point (multiplicative)
- hotspotMinOceanDepth: deep-ocean requirement (implementation-defined check)
- hotspotMinDistanceFromLand: 3–4 tiles (to avoid coastal clutter)
- hotspotMinLaneWidth: maintain global acceptance width (no violations)
- hotspotClusterSizeRange: 1–3 tiles
- hotspotMinTrailSeparation: 10–14 tiles (avoid parallel clutter)

3.4 Generation algorithm (tagging)
- Choose N ∈ [1..maxHotspotTrails] deep-ocean seeds far from land and each other (respect hotspotMinTrailSeparation).
- For each trail:
  - Pick a heading (theta) and a small bend factor based on low-frequency noise evaluated along the path to simulate plate drift.
  - March hotspotTrailLength steps:
    - Advance by hotspotTrailStep in the current heading.
    - Evaluate probability p = hotspotTrailDecayStart × (hotspotTrailDecayRate^stepIndex).
    - If within deep-ocean and far from land, mark HOTSPOT_TRAIL at this point with strength ∝ p.
- Notes:
  - Store the polyline points for diagnostics (optional).
  - Do not place islands here—only tag, to be consumed by island pass.

3.5 Integration points
- addIslandChains:
  - When evaluating potential deep-ocean island placement, bias probability if HOTSPOT_TRAIL is set:
    - islandChance += f(strength) where strength comes from the trail step probability.
  - Enforce spacing and lane width; hard-cap total island count per trail.
  - Cluster size: use existing cluster logic but restrict to hotspotClusterSizeRange for trail points.
- refineRainfallEarthlike:
  - Optional tiny fertility signal:
    - Near HOTSPOT_TRAIL tiles, apply volcanicFertilityBoost (+5..+10) to rainfall within radius ≤ 2 if elevation is moderate/low and still clamped.
  - Keep off by default for first iteration if risk of over-stacking with coastal humidity is high.
- designateEnhancedBiomes:
  - If volcanic fertility boost is enabled:
    - For tiles near HOTSPOT_TRAIL and with sufficient rainfall, prefer lusher variants (forest/tropical) as gentle nudges.

3.6 Guardrails
- Never reduce lane widths below hotspotMinLaneWidth.
- Keep all rainfall adjustments clamped [0, 200].
- Keep total hotspot islands small; cap per trail and globally.
- Respect minDistanceFromStarts for intrusive changes (rarely needed for deep ocean but retain).

3.7 Diagnostics and validation
- Logs:
  - “Drawing hotspot trails…” with count and per-trail length.
- Optional overlay dumps:
  - HOTSPOT_TRAIL polyline points and island placements.
- Acceptance checklist:
  - Lanes unchanged in width; islands align on trails; density is sparse.
  - No accidental coastal clutter; trails read as single clean lines.


4) Motif B — Rift Valleys

4.1 Narrative intent
- Emulate continental rifting: linear lakes, slightly greener shoulders, and a subtle humidity corridor. Optional continuation to coastlines in later phases.

4.2 Visual targets
- 1–2 rift lines per large continent (or zero for small fragments).
- 6–10 total lake tiles per continent (distributed across 1–3 lake chains).
- Visible greener shoulders adjacent to rift without overriding base biomes.

4.3 Tunables
- maxRiftLinesPerContinent: 2
- riftMinContinentArea: threshold to qualify for rift consideration
- riftLineLength (steps): 12–24 (scaled with continent size)
- riftStep (tiles between points): 2–3
- riftLakeDensity: 0.15–0.25 chance for a line tile to become lake (if lowland)
- riftMaxLakeTilesPerContinent: 8–12
- riftHumidityBoost: +5..+12 (clamped; applied near line)
- riftHumidityRadius: 1–2
- riftShoulderWidth: 1–2 tiles on each side (derive via perpendicular projection)
- riftShoulderBiomePreference:
  - Temperate: grassland > plains when rainfall allows
  - Tropical: forest/jungle if wet enough (validated)
- riftMinDistanceFromStarts: 8–10 (avoid carving lakes next to starts)
- riftMinSeparation: 12 tiles between parallel rifts

4.4 Generation algorithm (tagging and lake carving)
- For each continent meeting riftMinContinentArea:
  - Choose R ∈ [0..maxRiftLinesPerContinent] rift seeds with long span potential, avoiding mountains and high elevations if possible.
  - For each rift:
    - March riftLineLength steps with low curvature (long linear feel). Step size riftStep.
    - Tag RIFT_LINE along the path.
    - Determine lateral RIFT_SHOULDER tiles by projecting perpendicular offsets up to riftShoulderWidth on both sides (in-bounds, land-only).
    - If a RIFT_LINE tile is lowland, sufficiently far from starts (≥ riftMinDistanceFromStarts), and riftLake budget remains:
      - With probability riftLakeDensity, convert to a 1–2 tile lake micro-cluster (if valid).
      - Tag these converted tiles for diagnostics (RIFT_LAKE_CANDIDATE).
  - Stop carving when riftMaxLakeTilesPerContinent is reached.

4.5 Integration points
- buildEnhancedRainfall (no change):
  - Keep baseline intact for band blending.
- refineRainfallEarthlike (after rivers):
  - For tiles at distance d ≤ riftHumidityRadius from RIFT_LINE:
    - rainfall += scaled(riftHumidityBoost, by elevation: stronger at low elevation)
    - Clamp to [0, 200].
- designateEnhancedBiomes:
  - For RIFT_SHOULDER tiles:
    - If rainfall permits, bias toward grassland/forest in temperate zones.
    - In tropical zones, gentle increase toward forest/rainforest probabilities when wet enough.
  - Always leave base biome eligibility in control; this is a preference, not an override.
- addDiverseFeatures:
  - No special additions in v0.1. Optionally, allow slightly higher forest density on shoulders (validated) in later iterations.

4.6 Guardrails
- Lake conversions:
  - Only in lowland; respect adjacency and not near starts; avoid excessive clustering.
- Humidity stacking:
  - Rift boost is small; clamps applied per-application.
  - Avoid compounding with multiple motifs by either capping cumulative boosts or applying diminishing returns when a tile has multiple StoryTags.
- Performance:
  - Tagging is linear and sparse; shoulder calculation uses fixed small offsets.
- Visual restraint:
  - Hard caps on lake tiles and number of rift lines per continent.

4.7 Diagnostics and validation
- Logs:
  - “Marking rift lines and basins…” with per-continent counts and lake tile totals.
- Optional overlay dumps:
  - RIFT_LINE polyline, RIFT_LAKE_CANDIDATE tiles, RIFT_SHOULDER bands.
- Acceptance checklist:
  - Lake chains appear in long valleys, not peppered randomly.
  - Shoulder greening visible but modest; biome transitions remain believable.
  - Starts remain fair; no accidental excessive freshwater near spawns.


5) Pipeline Placement

- After landmasses and coasts exist, before Climate Phase A:
  - Compute StoryTags for HOTSPOT_TRAIL and RIFT_LINE/SHOULDER.
- In addIslandChains:
  - Read HOTSPOT_TRAIL to bias deep-ocean island placement with strict spacing and lane safeguards.
- In refineRainfallEarthlike (Phase B, after rivers):
  - Apply riftHumidityBoost around RIFT_LINE (radius ≤ 2).
  - Optionally apply volcanicFertilityBoost around HOTSPOT_TRAIL (off by default for v0.1).
- In designateEnhancedBiomes:
  - Apply shoulder biome preferences (temperate grassland corridors, tropical forest bias when appropriate).
- Optional later:
  - Reef chances along passive shelves (not part of this doc).
  - Orogeny amplifiers (windward/lee)—defined in Climate Story README, separate doc.


6) Logging and Telemetry

- Phase messages:
  - “Drawing hotspot trails…”
  - “Marking rift lines and basins…”
- Suggested per-motif summaries:
  - Trails: count, average length, total tagged points, islands realized.
  - Rifts: per-continent count, lake tiles placed, humidity boost stats (mean/95th).
- Optional JSON events:
  - STORY_HOTSPOTS_BEGIN/END, STORY_RIFTS_BEGIN/END with counts and seeds for reproducibility.

- Temporary dump toggles (dev only):
  - dumpStoryHotspots(), dumpStoryRifts()
  - Visualize overlays and save compact logs for quick scouting against outputs/1.0.0.


7) QA and Acceptance

- Oceans:
  - Lanes must remain open; hotspot islands cannot chain into bridges.
- Interiors:
  - Rift lake chains align along long axes; shoulder greening visible but not dominant.
- Rainfall:
  - All boosts are clamped; histograms stay close to v1.0.0 with small local deviations.
- Biomes:
  - Temperate river corridors + rift shoulders yield plausible grassland/forest transitions.
  - No tundra regression; tropical regions remain consistent where rainfall allows.
- Starts and Balance:
  - No lakes or heavy fertility adjacent to starts (respect min distances).
  - Wonders/resources remain base-driven; this layer is cosmetic/low-impact mechanically.


8) Risks and Mitigations

- Sea-lane narrowing due to hotspot islands:
  - Enforce hotspotMinLaneWidth; skip placement if violation detected.
- Over-greening from multiple small boosts stacking:
  - Apply diminishing returns when multiple StoryTags apply to the same tile (e.g., cap net boost or halve the second boost).
- Visual clutter:
  - Hard caps, minimum separations, and favor long clean lines over dense dots.
- Performance spikes:
  - Keep all scans radius ≤ 4; prefer direct addressing and early exits in neighborhood checks.


9) Implementation Checklist (v0.1)

- StoryTags scaffolding:
  - Arrays or sparse sets for HOTSPOT_TRAIL, RIFT_LINE, RIFT_SHOULDER, RIFT_LAKE_CANDIDATE.
- Hotspot Trails:
  - Deep-ocean seed selection with separation.
  - Polyline stepping with decaying strength tagging.
  - addIslandChains bias integration with spacing and lane-width guards.
- Rift Valleys:
  - Per-continent qualification; seed and step rift lines; tag shoulders.
  - Lake carving in lowlands with per-continent budget and start-distance guard.
  - refineRainfallEarthlike: apply riftHumidityBoost near RIFT_LINE (radius ≤ 2, clamped).
  - designateEnhancedBiomes: shoulder preferences contingent on rainfall/latitude.
- Logging + optional dumps:
  - Phase messages and minimal stats per motif.
- Update docs:
  - Climate Story README: note v0.1 motifs enabled and tunables.


10) Default Tunables (suggested starting values)

- Hotspot Trails:
  - maxHotspotTrails: 3
  - hotspotTrailLength: 10
  - hotspotTrailStep: 4
  - hotspotTrailDecayStart: 0.5
  - hotspotTrailDecayRate: 0.85
  - hotspotMinOceanDepth: engine-defined “deep ocean” check
  - hotspotMinDistanceFromLand: 4
  - hotspotClusterSizeRange: 1..2
  - hotspotMinTrailSeparation: 12
  - hotspotMinLaneWidth: use current acceptance lane width

- Rift Valleys:
  - maxRiftLinesPerContinent: 2
  - riftMinContinentArea: tuned for Huge; e.g., ≥ 4% of map tiles
  - riftLineLength: 18
  - riftStep: 2
  - riftLakeDensity: 0.2
  - riftMaxLakeTilesPerContinent: 10
  - riftHumidityBoost: +8
  - riftHumidityRadius: 2
  - riftShoulderWidth: 1
  - riftMinDistanceFromStarts: 8
  - riftMinSeparation: 12


11) Future Extensions (beyond v0.1)

- Hotspot fertility coupling: enable small rainfall boosts near trails by default after validation.
- Rift-coast tie-in: extend select rifts to nearby coastlines with subtle estuary/delta motifs (guard lanes).
- Passive/active margin system and reef belts (separate doc).
- Orogenic belt amplifiers (windward/lee) layered with the rainfall refinement logic.
- Diagnostics: seed snapshot export, per-motif tile counts to CSV, rainfall histograms.


12) Change Log

- v0.1 (proposed):
  - Added Hotspot Trails and Rift Valleys motif specifications, tunables, integration points, guardrails, and QA guidance for first iteration.

— End of Hotspot Trails and Rift Valleys v0.1 —