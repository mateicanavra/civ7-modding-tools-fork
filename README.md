# Epic Diverse Huge Map Generator

Version: 1.0.0

This mod adds a custom, large-scale procedural map generator focused on organic regional formation driven by geology–climate interaction. It builds on the base game's generators and then layers climate dynamics, biome nudging, and coastline/island shaping to produce believable, high-variety worlds.

Repository: ~/Library/Application Support/Civilization VII/Mods/epic-diverse-huge-map/

Highlights (v1.0.0)
- Three organic, vertical continental bands separated by real oceans for naval play.
- Ruggedized coastlines and tiny island chains that preserve sea lanes.
- Two-phase climate: baseline latitude bands + earthlike refinements using humidity gradients, prevailing winds, orographic rain shadows, river corridor greening, and low-basin wetness.
- Biome pass that respects the base generator, then gently nudges tiles to match climate and gameplay goals (tropical coasts near the equator, greener temperate river valleys, restrained tundra).
- Wonders, resources, snow, floodplains, and starts remain compatible with base systems.
- Natural wonders: slightly increased vs. default (+1 over map defaults).
- Lakes: moderated vs. earlier experiments; tuned for balance within the new landmass design.

What changed from earlier drafts
- Removed aggressive cliff systems for better playability and performance.
- Reduced experimental mountain/lake amplification; rely primarily on base elevation/hills with curated rainfall/biome logic to shape regions.
- Cleaned up coastal shaping and island placement to avoid chokepoint spam.
- Shifted to a “compatible-first” approach: the base generators remain the source of truth, with our passes refining behavior.

How to use
1) Enable the mod
- Launch Civilization VII
- Main Menu → Additional Content → Mods
- Enable “Epic Diverse Huge Map”
- Restart the game

2) Start a game
- Create Game → Select “Epic Diverse Huge”
- Choose Huge map size for the best continental structure and regional coherence
- Configure other settings as desired

3) Optional: Monitor generation via logs (see “Monitoring” below)

Generation pipeline (simplified)
- Start sectors: choose start-sector grid early, with optional bias to place the human start nearer the equator (vanilla-compatible helpers).
- Landmasses: three-band continents with per-row sinusoidal jitter and fractal noise to avoid straight borders; center bias strengthens land “cores.”
- Elevation and water:
  - Coasts expanded per base generator, followed by a ruggedizing pass that carves bays/fjords and a deep-water island chain pass.
  - Base mountains/hills/volcanoes for balance; lakes tuned for density per map settings (fewer than earlier experimental iterations).
- Climate and rivers:
  - Build baseline rainfall (vanilla) → blend with latitude bands (wet equator, drier subtropics, temperate mid-latitudes, cold/dry poles).
  - Model rivers; then apply earthlike refinements:
    - Coastal/lake humidity gradient decaying inland
    - Prevailing-wind orographic rain shadows (easterlies/trade winds and westerlies by latitude)
    - River corridor greening and enclosed low-basin humidity
- Biomes and features:
  - Run base biome assignment, then apply climate-aware tweaks:
    - Tropical coasts near equator with high rainfall
    - Temperate grassland preference along river valleys
    - Tundra constrained to extreme latitude/elevation with low rainfall
  - Run base features, then add density in a few targeted cases (rainforest/forest/taiga), always validated by the engine
- Wonders, floodplains, snow, resources, discoveries:
  - Slightly increased natural wonders vs. map defaults
  - Floodplains, snow, resources, and exploration sites use base systems
  - Start positions assigned with the standard method to maintain compatibility

Monitoring (optional)
A lightweight Python script is included to follow generation progress by tailing the game’s script log.

Run live monitoring:
- macOS:
  cd ~/Library/Application\ Support/Civilization\ VII/Mods/epic-diverse-huge-map/
  python3 external_map_monitor.py

- Analysis mode (parse past events):
  python3 external_map_monitor.py --analyze

What you’ll see:
- Lifecycle messages like:
  - “Loading Epic Diverse Huge Map Generator”
  - “Building enhanced rainfall patterns...”
  - “Creating enhanced biome diversity...”
  - “Adding diverse terrain features...”
- If you enable JSON markers (disabled by default), the monitor will also summarize:
  - EPIC_MAP_GEN_START with width/height/timestamp
  - EPIC_MAP_GEN_COMPLETE with wonders/lake density/variety/timestamp

Enabling JSON start/end events (optional)
- In maps/epic-diverse-huge.js, search for “EPIC_MAP_GEN_START” and “EPIC_MAP_GEN_COMPLETE”
- Uncomment the two console.log blocks (one in requestMapData, one near the end of generateMap)
- This will allow external_map_monitor.py to print structured summaries of each run

Compatibility notes
- The script imports base-standard helpers provided by the game or active base modules. The resources/ folder here is a reference to community sources and is not required at runtime.
- Start positions are assigned using the standard approach, with sector selection and continent bounds compatible with vanilla expectations.
- The generator has been tuned for Huge maps; other sizes may work but are not the primary target.

Troubleshooting
- Mod not visible: ensure it’s in the user mods directory shown above and that epic-diverse-huge-map.modinfo is present; restart the game after enabling.
- Monitor shows no JSON summaries: the JSON event logs are disabled by default; enable them as described above, or rely on the phase messages already present.
- Performance: if generation feels heavy, avoid running other intensive mods concurrently; large maps with complex coastlines can take longer.

Files of interest
- maps/epic-diverse-huge.js — generator logic and climate/biome refinements
- external_map_monitor.py — optional log monitor
- outputs/1.0.0/ — example output images from version 1.0.0
- EPIC_DIVERSE_MAP_GUIDE.md — general usage guide; this README reflects the authoritative behavior for v1.0.0

Enjoy exploring truly diverse, large-scale worlds with coherent regions, believable corridors, and rich coastal/naval play.