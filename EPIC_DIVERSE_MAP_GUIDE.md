# Epic Diverse Huge Map Generator – Guide (v1.0.0)

This guide reflects the v1.0.0 behavior of the Epic Diverse Huge map script. It replaces earlier drafts that mentioned aggressive cliff systems, doubled natural wonders, tripled lake counts, or globally forcing mountains to tundra. Those are no longer part of the design.

## What this is

A custom map generator for Civilization VII that produces large, organic worlds with:
- Three principal continental bands separated by real oceans (great for naval play).
- Ruggedized coasts and tiny island chains that add character without clogging sea lanes.
- Two-phase climate modeling that blends latitude bands with earthlike refinements:
  humidity gradients from water, prevailing winds with orographic rain shadows, river corridor greening, and enclosed low-basin wetness.
- Biome nudges after the base pass to align with climate and gameplay goals (tropical coasts near the equator, greener temperate river valleys, restrained tundra).
- Compatibility with the base systems for wonders, resources, snow, floodplains, and discovery placement.

Best results are on Huge map size.

## Installation

Already installed in your user mods directory:
~/Library/Application Support/Civilization VII/Mods/epic-diverse-huge-map/

Files of interest:
- maps/epic-diverse-huge.js — generator logic and climate/biome refinements  
- external_map_monitor.py — optional log monitor  
- outputs/1.0.0/ — example maps from v1.0.0  
- epic-diverse-huge-map.modinfo — mod configuration  
- config/config.xml — registers the map type  

## How to use

1) Enable the mod
- Launch Civilization VII
- Main Menu → Additional Content → Mods
- Enable “Epic Diverse Huge Map”
- Restart the game

2) Start a game
- Create Game → Choose map: “Epic Diverse Huge”
- Choose Huge map size for the intended continental structure
- Configure other options as desired and start

## What to expect (v1.0.0)

- Landform
  - Three major land bands with generous side oceans and a wider mid-ocean.
  - Coastlines are organically rugged; small island clusters appear in deeper water but avoid nearshore congestion.

- Elevation and water
  - Mountains and hills primarily follow the base generator for balance (no aggressive cliff systems).
  - Volcanoes are enabled via base support.
  - Lakes are lighter than earlier experiments and tuned for current landmass design (not “tripled”).

- Climate and rivers
  - Baseline rainfall from the base generator is blended with latitude bands (wet equator → temperate mid-lats → cold/dry poles).
  - After rivers are modeled and named, an earthlike refinement adds:
    - Coastal and lake humidity that decays inland.
    - Prevailing-wind orographic rain shadows (trade winds, westerlies, polar easterlies by latitude band).
    - River corridor greening and enclosed low-basin wetness at lower elevations.

- Biomes and features
  - Base biome assignment first; then climate-aware nudges:
    - Tropical coasts near the equator with high rainfall are encouraged to be tropical.
    - Temperate river valleys with sufficient rainfall trend toward grassland for better starts and corridors.
    - Tundra appears mainly at very high latitudes or very high elevation with low rainfall (not globally forced on mountains).
  - Base feature generation runs, then targeted extra density is applied where valid:
    - Rainforest: up to ~40% additional chance in very wet tropical zones.
    - Forest: up to ~30% additional chance in wetter temperate grasslands.
    - Taiga: up to ~35% additional chance in cold tundra at lower elevations.
  - All feature placements respect engine validation.

- Wonders, floodplains, snow, resources, discoveries
  - Natural wonders are slightly increased (+1 vs. the map’s default).
  - Floodplains and snow follow base behavior for the given world.
  - Resources are placed after terrain and biomes/features, preserving balance while adapting to the new regional mix.
  - Discoveries are generated after starts.

## Generation pipeline (overview)

- Start sectors: choose start-sector grid early (vanilla-compatible), with support for placing a human closer to the equator when applicable.
- Landmass carving: three continental bands with per-row sinusoidal jitter and fractal noise; center bias strengthens continental “cores” and yields more fragmented margins.
- Coast and islands: base coast expansion, then a ruggedizing pass for bays/fjords, followed by deep-water island seeding.
- Elevation/water: base mountains/volcanoes/hills; balanced lakes for this landform.
- Climate: baseline rainfall blended with latitude bands → rivers modeled → earthlike refinements (humidity gradients, wind shadows, rivers/basins).
- Biomes/features: base assignment → targeted climate/gameplay nudges → validated feature density tweaks.
- Post: wonders (+1 vs. defaults), floodplains, snow, resources, discoveries, starts.

## Optional monitoring

A lightweight Python script can follow generation progress by tailing the game’s script log.

- Live monitoring:
  - macOS: from the mod directory, run “python3 external_map_monitor.py”
- Analysis mode (parse past events): run with “--analyze”

You will see loader messages and phase markers (e.g., “Building enhanced rainfall patterns...”, “Creating enhanced biome diversity...”, “Adding diverse terrain features...”).

JSON-structured “start/complete” events are supported but disabled by default in the script. If you want the monitor to print structured summaries, open maps/epic-diverse-huge.js and uncomment the two console.log blocks labeled EPIC_MAP_GEN_START and EPIC_MAP_GEN_COMPLETE.

## Customization tips

- Coast/island character
  - The rugged coast pass occasionally converts coastal land to shallow water (bays) and adjacent ocean to coast (peninsulas/fjords).
  - The island pass seeds small clusters in deeper waters and avoids nearshore crowding.

- Lakes
  - The lakes parameter fed to the base generator is tuned to be lighter than earlier experiments for v1.0.0. If you adjust it, keep naval lanes and river basins in mind.

- Rainfall/biomes
  - The two-phase rainfall system and gentle biome nudges drive most “regional” character. If you tune bands or thresholds, review results at multiple latitudes and elevations to maintain believable transitions.

- Performance/playability
  - Aggressive cliff and extra mountain systems were removed to keep turns smooth and pathing fair. Favor small, targeted changes over heavy global multipliers.

## Compatibility notes

- This generator builds on base-standard modules that are provided by the game or its core modules at runtime. The resources/ subtree in this repo is a reference to community sources and not required for normal use.
- The generator is tuned for Huge maps. Other sizes may work, but Huge is the intended experience.
- Start placement uses the standard compatible method with early sector selection.

## Troubleshooting

- Mod not visible:
  - Verify the mod is in the user mods directory listed above and epic-diverse-huge-map.modinfo is present. Restart the game after enabling.

- No JSON summaries in the monitor:
  - Phase messages will still appear.
  - For structured summaries, uncomment the JSON console logs in the map script as noted above.

- Balance/performance concerns:
  - Disable other heavy map mods when testing.
  - Prefer small parameter adjustments (coast ruggedness, island seeding, rainfall noise) over global multipliers.

## Credits

- Mapgen: Epic Diverse Huge, layered on base-standard generators for compatibility.
- Design goals: organic, climate-aware regions; strong naval play; sensible river corridors; restrained tundra.
- Example outputs: see outputs/1.0.0 for samples produced by v1.0.0.

Enjoy exploring coherent, diverse worlds with believable climate–geology interplay.