# Epic Diverse Map Generator — Diagnostic Guide (v1.0.0)

Scope
- This guide helps diagnose issues where the game crashes or returns to menu after map generation.
- It reflects the current v1.0.0 design: no aggressive cliff systems, mountains/lakes primarily from base generators, and slightly increased natural wonders (+1 vs. map defaults).

Summary
- In v1.0.0, generation relies heavily on the base systems for elevation/hills/lakes/wonders/resources/biomes and then applies gentle climate/biome refinements.
- Most failures observed in practice are due to configuration mismatches, mod conflicts, or environment issues—not the terrain algorithms themselves.

Common Symptoms
- Generation logs report successful terrain/feature/biome passes, but the game exits or returns to the setup screen after “Generate Map.”
- Starts are assigned, but the session fails to launch.
- No obvious JavaScript errors appear in logs, or errors are unrelated to generation passes.

Quick Checklist (Do These First)
1) Run on Huge map size (this mapgen is tuned for Huge).
2) Disable other heavy map or terrain mods temporarily.
3) Reduce player count and/or city-state count to verify capacity.
4) Restart the game after enabling/disabling mods.
5) Confirm the mod is in the user mods directory.

Map Configuration Verification
The script expects certain fields from the map database entry. Ensure your map row provides these (names must match the game’s schema). In particular, v1.0.0 reads:
- NumNaturalWonders (baseline; script adds +1 at runtime)
- LakeGenerationFrequency
- PlayersLandmass1, PlayersLandmass2
- StartSectorRows, StartSectorCols (if applicable in your build)

Example map row (adjust attributes as appropriate for your build):
<Maps>
  <Row
    File="{epic-diverse-huge-map}maps/epic-diverse-huge.js"
    Name="LOC_MAP_EPIC_DIVERSE_HUGE_NAME"
    Description="LOC_MAP_EPIC_DIVERSE_HUGE_DESCRIPTION"
    SortIndex="100"
    DefaultSize="5"
    MinSize="3"
    MaxSize="6"
    LakeGenerationFrequency="30"
    NumNaturalWonders="10"
    PlayersLandmass1="6"
    PlayersLandmass2="6"
    StartSectorRows="3"
    StartSectorCols="4"
  />
</Maps>

Notes:
- The script sets iNumNaturalWonders = max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders).
- LakeGenerationFrequency is consumed by the base generator; v1.0.0 uses moderated lakes.
- PlayersLandmass1/PlayersLandmass2 and sector rows/cols should be consistent with the target player count.

Start Placement Constraints
- If you request more players than the configured landmasses/start sectors support, start assignment can fail in non-obvious ways.
- For a quick sanity check:
  - Try 6–8 players on Huge first.
  - Avoid additional map scripts that override start placement simultaneously.
  - Confirm human-player-near-equator logic is allowed by your settings.

Base Module Availability
- This script imports core/base “standard” generation modules at runtime (elevation, rainfall base map, biomes, resources, wonders, snow, etc.).
- Ensure the base modules referenced by the imports are available and loaded in your environment.
- If a base module path is incorrect or the module is disabled, generation may appear to succeed but fail later.

Monitoring and Logs
- The map script prints clear phase markers (e.g., “Building enhanced rainfall patterns...”, “Creating enhanced biome diversity...”, “Adding diverse terrain features...”).
- Optional JSON start/complete logs (commented out by default) can make troubleshooting easier:
  - Search for EPIC_MAP_GEN_START and EPIC_MAP_GEN_COMPLETE in the script and uncomment the console.log blocks.
  - Use the included Python monitor script (external_map_monitor.py) to tail and summarize.
- If these events log successfully yet a crash occurs afterward, the issue is most likely outside the terrain/feature passes (e.g., configuration, content conflicts, or post-gen initialization).

Minimal Repro Steps (to isolate mod conflicts)
1) Enable only Epic Diverse Huge and core/base modules. Disable other map/terrain-altering mods.
2) Use Huge size, 6–8 players, standard speed.
3) Try a few different seeds (or default/random) to rule out seed-specific anomalies.
4) If stable, re-enable additional mods incrementally to identify conflicts.

Environment Considerations
- Memory/CPU pressure can surface on large scripts/maps with many concurrent mods. If you suspect resource issues:
  - Close background apps.
  - Temporarily reduce the number of AI players or city-states.
  - Keep island/coastline-heavy mods disabled while testing.

What Not To Change (v1.0.0)
- Do not re-enable aggressive cliff systems or add heavy global mountain amplification; these were intentionally removed for stability and playability.
- Avoid large global multipliers for lakes or rivers; v1.0.0 is tuned around base behavior plus climate/biome refinements.

If Problems Persist
- Verify the exact attributes your build expects in the map database row; some builds gate certain fields differently.
- Test a vanilla map type to confirm your base environment is stable.
- Re-check the mod load order and make sure there aren’t duplicate map type names clashing with other mods.
- Collect the log segment from map generation through to the failure point; include the visible phase markers and any subsequent errors when asking for help.

Expected v1.0.0 Behavior (for reference)
- Landmasses: three organic continental bands with true oceans.
- Coasts/Islands: lightly ruggedized coasts; small deep-water island clusters that preserve sea lanes.
- Climate: base rainfall blended with latitude bands, then refined with coastal/lake humidity, prevailing-wind orographic shadows, river-corridor greening, and low-basin wetness.
- Biomes/Features: base pass + gentle nudges toward tropical coasts (near equator, wet), temperate river grasslands, and restrained tundra; validated feature density increases for rainforest/forest/taiga.
- Wonders: +1 vs. map defaults.
- Lakes: moderated (not “tripled”).
- Starts: chosen with the compatible standard method.

Contact/Next Steps
- If you share logs, include:
  - Map size and player count
  - The relevant console markers (phase messages, optional JSON start/complete if enabled)
  - Any errors after “Generate Map” completes
- We can then correlate failures with config, environment, or post-gen steps and suggest precise fixes.
