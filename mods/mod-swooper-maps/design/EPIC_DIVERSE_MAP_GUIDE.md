# Epic Diverse Huge Map — Internal Guide (v1.0.0)

Purpose
- Short, internal reference for ongoing iteration. No setup/how-to. Use this to find the right hooks, verify outcomes, and decide what to tweak next.

Pointers (authoritative sources)
- Core script: maps/epic-diverse-huge.js
- Design/architecture and acceptance criteria: DESIGN.md
- Example outputs for v1.0.0: outputs/1.0.0
- Diagnostics (configs, conflicts, stability): DIAGNOSTIC_FIX.md
- Terrain/feature/biome usage notes (what we set vs. base): TERRAIN_FEATURE_VERIFICATION.md
- In-game name/description only: text/en_us/MapText.xml

Current invariants
- Target: Huge maps.
- Landform: three continental bands; true oceans; rugged coasts; small deep-water island clusters.
- Climate: two-phase rainfall (baseline bands → earthlike refinements: humidity gradient, prevailing-wind orographic shadows, river/basin greening).
- Biomes/features: base pass first, then gentle, validated nudges (tropical coasts near equator; temperate river grasslands; restrained tundra).
- Wonders: +1 vs. map defaults. Lakes: moderated.
- Rainfall clamped to [0, 200].
- Feature placement gated via TerrainBuilder.canHaveFeature; feature IDs resolved via GameInfo.Features.lookup.
- Base-standard modules are assumed present at runtime (elevation, coasts, rainfall baseline, biomes, features, resources, snow, wonders, discoveries, starts).

Iteration hotspots (functions to tweak)
- Landform
  - createDiverseLandmasses: band widths, jitter amplitude, center bias, water threshold.
  - addRuggedCoasts: bay/peninsula probabilities; ensure sea lanes stay open.
  - addIslandChains: fractal threshold; cluster size; min-distance-from-land.
- Climate
  - buildEnhancedRainfall: latitude band targets, blend weights with base map, coastal/shallow-water bonuses, noise jitter.
  - refineRainfallEarthlike:
    - distanceToNearestWater radius and lowland bonus
    - wind vectors by latitude (E→W vs. W→E) and lookahead steps
    - barrier strength thresholds (mountain/elevation) and reduction curve
    - river adjacency bonus (scaled by elevation)
    - low-basin detection radius and bonus
- Biomes/features
  - designateEnhancedBiomes: thresholds for tundra restraint; tropical coastal criteria; river-valley grassland criteria.
  - addDiverseFeatures: per-biome extra feature chances; keep TerrainBuilder.canHaveFeature checks.

Quick verification checklist
- Three land bands with real oceans on both sides and mid-ocean is present.
- Rivers are modeled and named before refineRainfallEarthlike runs.
- Rain shadows appear leeward of barriers based on latitude wind rules.
- Tropical coasts near equator show up when rainfall is high.
- Temperate river corridors trend greener; tundra restrained to extreme latitude/elevation under low rainfall.
- Islands appear offshore (not crowding nearshore tiles); coastlines feature occasional bays/fjords.
- Resources placed after biomes/features; starts assigned via the standard method (no post-gen crash).

Debugging knobs (minimal friction)
- Optional console markers (commented out by default in the script):
  - EPIC_MAP_GEN_START (requestMapData), EPIC_MAP_GEN_COMPLETE (generateMap end).
- Optional debug dumps (commented out in the script): dump* helpers for terrain/elevation/rainfall/biomes/features.
- Log follower: external_map_monitor.py (recognizes our phase markers; JSON summaries shown if markers enabled).
- Config sanity: see DIAGNOSTIC_FIX.md for a sample map row and attribute expectations (NumNaturalWonders, LakeGenerationFrequency, PlayersLandmass1/2, StartSectorRows/Cols).

Safe tweak ranges (guidance, not rules)
- Coast ruggedizing: keep probabilities sparse; avoid contiguous conversions that form chokepoints.
- Island seeding: high fractal threshold, small clusters (1–3), enforce min distance to land.
- Humidity gradient: radius ≈ 4; lowland bonus small.
- Orographic shadows: barrier detection up to ~4 tiles; reduction 10–30 range depending on barrier strength.
- River/low-basin bonuses: single-digit to low-teens; stronger at lower elevations.

Open items (next iterations)
- Extract layers: CoastlineLayer, ClimateLayer (BaselineBands vs. EarthlikeRefinement), FeatureLayer rules as data.
- Parameterize wind logic (hemispheric asymmetry/monsoon toggles).
- Add optional telemetry hooks: per-pass timing; rainfall histogram snapshots for smoke tests.
- Trim legacy monitor triggers (keep only markers we actually emit).

Version note
- Internal doc focused on iteration. For the full design and acceptance criteria, see DESIGN.md.