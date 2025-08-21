# Epic Diverse Huge Map Generator (v1.0.0)

Source files are maintained in TypeScript. Original JavaScript versions are preserved under `js-archive/` and are used in tests to ensure the compiled output matches the legacy scripts.
This README is for internal development. It summarizes what matters for iteration and debugging. For full architecture, see DESIGN.md.

What this is (concise)
- A custom mapgen that layers climate- and region-formation logic on top of the base generators.
- Landform: three organic continental bands with true oceans, rugged coasts, and small deep-water island clusters.
- Climate: two-phase rainfall (baseline bands → earthlike refinement with humidity gradients, prevailing-wind orographic shadows, river/basin greening).
- Biomes/features: base pass first, then gentle, validated tweaks for playability (tropical coasts near equator, greener temperate river valleys, restrained tundra).
- Natural wonders: +1 vs. map defaults. Lakes: moderated for balance.

Primary files and references
- Entries: maps/epic-diverse-huge*.js (each calls bootstrap({ presets, overrides }) then imports maps/map_orchestrator.js)
- Orchestrator: maps/map_orchestrator.js (registers engine listeners; orchestrates the pipeline)
- Resolved config: maps/config/resolved.js (single source of truth for reads)
- Defaults: maps/config/defaults/base.js (canonical baseline configuration)
- Presets: maps/config/presets/* (named partial configs to compose)
- Entry helper: maps/config/entry.js (bootstrap({ presets, overrides }))
- Design/architecture: DESIGN.md (authoritative). Note: entries explicitly import the orchestrator after bootstrap to ensure config is set before engine listener registration; this two-line entry pattern is deliberate and robust on the game VM.
- Example outputs: outputs/1.0.0 (screenshots of generated maps)
- Localization summary (for in-game name/desc only): text/en_us/MapText.xml

Runtime assumptions (observed)
- Uses base-standard modules for elevation, rainfall baseline, coasts, biomes, features, resources, wonders, snow, discoveries, and start placement.
- resources/ in this repo is a reference stub; not required at runtime in this setup.

Debugging hooks (keep handy)
- Log markers: the script prints clear phase messages:
  - “Loading Epic Diverse Huge Map Generator”
  - “Building enhanced rainfall patterns...”
  - “Creating enhanced biome diversity...”
  - “Adding diverse terrain features...”
- Optional JSON markers (disabled in v1.0.0 by default):
  - EPIC_MAP_GEN_START: in requestMapData (commented out)
  - EPIC_MAP_GEN_COMPLETE: near the end of generateMap (commented out)
  - To enable, uncomment those two console.log blocks in maps/map_orchestrator.js.
- Optional debug dumps (all commented out in the script):
  - dumpContinents / dumpTerrain / dumpElevation / dumpRainfall / dumpBiomes / dumpFeatures
  - Toggle temporarily when correlating visuals with data layers.

Hotspots for iteration (script functions)
- Landform:
  - createDiverseLandmasses(iWidth, iHeight, landmasses)
  - addRuggedCoasts(iWidth, iHeight)
  - addIslandChains(iWidth, iHeight)
- Climate:
  - buildEnhancedRainfall(iWidth, iHeight)  // baseline + latitude bands (blend with base)
  - refineRainfallEarthlike(iWidth, iHeight)  // humidity gradient, orographic shadowing, river/basin greening
  - Helpers: distanceToNearestWater, hasUpwindBarrier
- Biomes/features:
  - designateEnhancedBiomes(iWidth, iHeight)
  - addDiverseFeatures(iWidth, iHeight)

Known constraints (v1.0.0)
- Tuned for Huge maps.
- Aggressive cliff systems and heavy mountain amplification are intentionally removed (playability/perf).
- Feature placement is gated by TerrainBuilder.canHaveFeature; feature IDs are resolved via GameInfo.Features.lookup.
- Rainfall values are clamped [0, 200] in all passes.

If something looks off
- Validate bands and oceans: toggle dumpTerrain/dumpElevation/dumpRainfall and compare to outputs/1.0.0.
- Check river influence: ensure refineRainfallEarthlike runs after TerrainBuilder.modelRivers and defineNamedRivers.
- Verify wind/orographic behavior by latitude: adjust wind direction in refineRainfallEarthlike if needed.
- Reconfirm base module availability if post-generation failures occur (see DIAGNOSTIC_FIX.md for config sanity checks).

Change log
- See DESIGN.md (section: Change Log v1.0.0).

Next steps
- Use DESIGN.md’s “Future Work and Modularization Plan” to begin extracting layers cleanly.

Build and outputs (monorepo)
- Build this plugin only:
  - pnpm -F @civ7/plugin-mapgen build
- Build everything in the repo (Turbo pipeline):
  - pnpm -w -r build
- What the build does here:
  - Library bundle (for Node/CLI/tests):
    - tsup compiles src/index.ts → dist/index.js (ESM), dist/index.cjs (CJS), dist/index.d.ts (types)
  - CIV7 mod artifacts (for the game client):
    - A Bun script copies required runtime files from src → dist, preserving structure:
      - JS entries and modules: dist/maps/**
      - Modinfo: dist/epic-diverse-huge-map.modinfo
      - XML config: dist/config/config.xml
      - Localization: dist/text/en_us/MapText.xml
- Stability pledge during TS rewrite:
  - Keep the JS filenames and relative paths under dist/maps/** stable so the CIV7 client continues to load them.
  - Internal imports within those JS files should remain relative (e.g., ./config/*, ./layers/*); engine modules (e.g., /base-standard/…) are provided by the game at runtime and are not bundled here.
- How to consume:
  - Node/CLI/tests: import @civ7/plugin-mapgen (uses the library dist/* artifacts).
  - CIV7 client: consumes the copied JS/XML/modinfo under dist/ as part of the mod package.
