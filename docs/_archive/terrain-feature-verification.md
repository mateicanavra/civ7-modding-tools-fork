# Epic Diverse Huge Map Generator — Terrain and Feature Verification (v1.0.0)

Purpose
- Document what this script sets directly vs. what it delegates to the base generators.
- Clarify the terrain, biome, and feature types referenced by the script, and how placement is validated at runtime.
- Remove outdated claims from earlier drafts (e.g., “aggressive cliffs,” “tripled lakes,” “doubled wonders”).

Scope
- Version: 1.0.0
- Target: Civilization VII (Huge maps prioritized)
- Dependencies: Base-standard map generation modules provided by the game/core modules at runtime

Summary of actual behavior in v1.0.0
- Landform:
  - Three-band continental layout with true oceans; coastlines ruggedized; small deep-water island clusters.
- Elevation/Water:
  - Mountains, hills, volcanoes, rivers, and lakes come primarily from the base generators.
  - Lakes are moderated vs. earlier experiments (not “3x”).
- Climate/Regions:
  - Two-phase rainfall: base + latitude bands, then earthlike refinements (coastal/lake humidity gradients, prevailing-wind orographic shadows, river-corridor and low-basin wetness).
- Biomes/Features:
  - Base biome and feature passes run first.
  - Script performs restrained biome nudges and targeted feature density increases, validated by engine checks.
- Wonders:
  - Natural wonders are slightly increased relative to map defaults (+1), not doubled.

What this script sets directly
- Terrain types (explicit set operations by this script):
  - globals.g_OceanTerrain
  - globals.g_CoastTerrain
  - globals.g_FlatTerrain
  - Notes:
    - Mountains/Hills/Volcanoes are not directly set here; they are added by base generators (`addMountains`, `addHills`, `addVolcanoes`).
    - Rivers are modeled/defined via base calls (`TerrainBuilder.modelRivers`, `TerrainBuilder.defineNamedRivers`).
    - Navigability parameters are passed using `globals.g_NavigableRiverTerrain`.
- Rainfall:
  - The script calls the base rainfall builder, blends with latitude bands, then refines post-rivers.
  - Rainfall values are clamped to [0, 200] in all passes.
- Biomes (post-base nudges):
  - globals.g_TundraBiome — applied only at very high latitude or extreme elevation when rainfall is low.
  - globals.g_TropicalBiome — encouraged on warm, wet, equator-adjacent coasts.
  - globals.g_GrasslandBiome — favored along warm/temperate river valleys with sufficient rainfall.
- Features (post-base additions):
  - FEATURE_RAINFOREST — in very wet tropical areas.
  - FEATURE_FOREST — in wetter temperate grasslands.
  - FEATURE_TAIGA — in cold tundra at lower elevations.

Validation and safety guarantees
- Feature placement is always gated by the engine:
  - The script checks `TerrainBuilder.canHaveFeature(iX, iY, featureId)` before calling `TerrainBuilder.setFeatureType`.
- Feature type resolution is data-driven:
  - `GameInfo.Features.lookup(name)` → `$index` or no result.
  - If lookup fails, the code returns `-1` and skips placement.
- Biome assignment uses engine constants and applies only when the tile is land and passes climate/latitude/elevation thresholds.
- Terrain operations include bounds checks on all neighborhood scans (coasts, islands, rainfall refinement, water-distance, etc.).
- Rainfall and related calculations are clamped (0–200) to avoid out-of-range states.
- Orographic barrier detection is robust:
  - Uses `GameplayMap.isMountain(nx, ny)` when available; otherwise falls back to elevation thresholds (e.g., ≥500) to infer a barrier.

Dependencies and assumptions
- The following identifiers are provided by base-standard modules at runtime:
  - Terrain constants: `globals.g_OceanTerrain`, `globals.g_CoastTerrain`, `globals.g_FlatTerrain`, `globals.g_NavigableRiverTerrain`
  - Biome constants: `globals.g_TundraBiome`, `globals.g_TropicalBiome`, `globals.g_GrasslandBiome`
  - Feature names: `"FEATURE_RAINFOREST"`, `"FEATURE_FOREST"`, `"FEATURE_TAIGA"`
- Base generators handle:
  - Coast expansion, mountains, hills, volcanoes, baseline rainfall map, lake generation, base biomes, base features, resources, snow, floodplains, natural wonders, and discovery sites.
- If a referenced feature or biome is not present in the active data set, the script’s validation/lookup logic prevents invalid placement.

Known non-goals (v1.0.0)
- No custom cliff system or aggressive cliff proliferation.
- No direct mountain placement or heavy mountain chaining beyond base behavior.
- No “tripled” lake density; lakes are tuned for balance within the three-band landmass layout.
- No hardcoded numeric feature IDs; all feature types are resolved via the game database.

Runtime verification checklist (how to confirm in your environment)
- Ensure the base-standard modules are available (they provide terrain/biome/feature definitions and the base generators).
- Enable the map, start a Huge game, and confirm:
  - Oceans separate three main land bands with organic coastlines.
  - Rivers exist and named rivers are defined; green corridors appear plausibly in warm/temperate zones.
  - Drier leeward regions exist behind mountain barriers appropriate to the latitude’s prevailing winds.
  - Tropical coasts near the equator appear where rainfall is high; tundra is restrained to extreme latitude/elevation and low rainfall.
- Optional: Uncomment the JSON “start/complete” logs in the script to aid monitoring.
- Optional: Temporarily enable the script’s commented debug dumps for rainfall/biomes/elevation while testing locally.

Change log vs. earlier drafts
- Removed references to “extensive cliff systems,” heavy mountain amplification, and “tripled” lakes.
- Clarified that wonders are slightly increased (+1 vs. defaults), not doubled.
- Emphasized compatibility-first design: base systems lead; script applies gentle climate/biome refinements and validated feature adjustments.

Conclusion
- In v1.0.0, the terrain/feature/biome usage is intentionally conservative and validation-driven.
- The script relies on base-standard definitions and generators, adds climate-aware refinements, and performs safe, validated post-passes for biomes and features.
- This approach yields organic, believable regions while maintaining balance and compatibility with the base game.