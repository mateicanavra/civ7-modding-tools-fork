# AGENTS.md — Quick Orientation for Incoming AI Agents

Purpose
- Get you productive fast on Epic Diverse Huge map generation (v1.0.0 baseline).
- Focus: conceptual/technical iteration on the generator, not user setup.

Mission
- Produce large, organic worlds where geology and climate interact convincingly.
- Preserve vanilla compatibility/balance; apply targeted refinements.

Repo Wayfinding
- Core script: maps/epic-diverse-huge.js
- Design/architecture: DESIGN.md (authoritative)
- Internal guide for iteration: EPIC_DIVERSE_MAP_GUIDE.md (short)
- Debug/config sanity: DIAGNOSTIC_FIX.md
- Terrain/feature notes: TERRAIN_FEATURE_VERIFICATION.md
- In-game text: text/en_us/MapText.xml
- Example outputs: outputs/1.0.0 (screenshots)
- Map DB row (minimal): config/config.xml
- Mod metadata: epic-diverse-huge-map.modinfo
- Resources (symlinked refs): resources/ — symlinked directories to base/community sources; use terminal to traverse. Examples (macOS):
  - cd ~/Library/Application\ Support/Civilization\ VII/Mods/epic-diverse-huge-map/resources
  - ls -l
  - readlink base-standard-maps
  - readlink better-maps-small-continents
  - readlink ged-ynamp

v1.0.0 Snapshot (What the generator does)
- Landform: three continental bands with true oceans; ruggedized coasts; small deep-water island chains.
- Climate: two-phase rainfall (base + latitude bands) then earthlike refinements:
  - Coastal/lake humidity gradient, prevailing-wind orographic rain shadows, river-corridor greening, low-basin wetness.
- Biomes/features: base pass first; gentle, validated nudges (tropical near equator coasts; greener temperate river valleys; restrained tundra) and targeted feature density (rainforest/forest/taiga).
- Wonders: +1 vs. map defaults. Lakes: moderated, not “tripled.”
- Tuned for Huge maps.

Mental Model (Pipeline)
1) Choose start sectors (pre-terrain).
2) Carve landmasses (3 bands; jittered edges; center bias).
3) Expand coasts (base), ruggedize coastlines, seed offshore islands.
4) Mountains/hills/volcanoes (base); moderated lakes (base).
5) Climate A: base rainfall → blend with latitude bands.
6) Rivers: model and name (base).
7) Climate B: earthlike refinements (humidity gradient, wind shadows, rivers/basins).
8) Biomes/features: base → climate-aware nudges → validated feature density.
9) Wonders/floodplains/snow/resources/discoveries (base), starts (standard).

Primary Hotspots (Functions to Iterate)
- Landform:
  - createDiverseLandmasses
  - addRuggedCoasts
  - addIslandChains
- Climate:
  - buildEnhancedRainfall (baseline + bands; blend weights; coastal bonuses; noise)
  - refineRainfallEarthlike (water-distance radius; wind vectors by latitude; barrier strength; river/basin bonuses)
  - Helpers: distanceToNearestWater, hasUpwindBarrier
- Biomes/features:
  - designateEnhancedBiomes (tundra restraint; tropical coasts; river-valley grasslands)
  - addDiverseFeatures (rainforest/forest/taiga chances; keep validation)

Guardrails (Non‑Goals and Invariants)
- Do NOT reintroduce aggressive cliff systems or heavy mountain amplification.
- Keep rainfall clamped to [0, 200].
- Always gate features with TerrainBuilder.canHaveFeature and resolve types via GameInfo.Features.lookup.
- Maintain pass ordering: rivers before “earthlike” refinements; biomes after rainfall; features after biomes.
- Preserve base-standard imports and compatibility; resources/ is reference-only.
- Keep oceans truly open; island/coast passes must not create chokepoint spam.

Debugging Workflow (Fast)
- Use existing phase logs (e.g., “Building enhanced rainfall patterns...”, “Creating enhanced biome diversity...”, “Adding diverse terrain features...”).
- Optionally enable JSON logs:
  - EPIC_MAP_GEN_START in requestMapData (commented out)
  - EPIC_MAP_GEN_COMPLETE near end of generateMap (commented out)
- Correlate visuals with data:
  - Temporarily enable dump* helpers in the script (rainfall/biomes/elevation/terrain).
  - Compare against outputs/1.0.0.
- Config sanity checks: DIAGNOSTIC_FIX.md (expected map row attributes and conflict isolation).

Acceptance Checklist (from DESIGN.md)
- Oceans: robust west/mid/east sea lanes; islands don’t block.
- Regions: river-green corridors; plausible rain shadows; wet coastal fringes taper inland.
- Biomes: tropical equatorial coasts when wet; tundra restrained; believable transitions.
- Balance: mountains/hills/resources/wonders consistent with base; gentle nudges only.
- Performance: passes remain O(width×height); small radii; no heavy flood fills.

Common Pitfalls
- Running refineRainfallEarthlike before river modeling.
- Over-dense coast/island tweaks causing chokepoints.
- Large rainfall boosts ignoring clamp range.
- Bypassing TerrainBuilder.canHaveFeature or hardcoding feature IDs.

Quick Iteration Template (10–30 min)
1) Pick a hotspot (e.g., wind vectors in refineRainfallEarthlike).
2) Make a minimal, parameterized change (e.g., adjust dx by latitude bands).
3) Build mental diffs: What should change visually and why?
4) Generate; scan phase logs; (optionally) enable dumps for the affected layer.
5) Compare with outputs/1.0.0; verify acceptance checklist; revert/iterate if regressions.

Future Work Targets (see DESIGN.md for plan)
- Modularize layers (CoastlineLayer, ClimateLayer split: BaselineBands vs. EarthlikeRefinement, FeatureLayer data rules).
- Parameterize hemispheric wind/monsoon options.
- Optional telemetry: per-pass timing, rainfall histograms, seed snapshots.

When You Touch Code
- Update DESIGN.md change log (v1.0.0+ deltas).
- Keep README concise; link to DESIGN.md for details.
- Avoid unverifiable claims in docs; prefer observed behavior or parameters.

That’s it—start in maps/epic-diverse-huge.js, keep DESIGN.md’s constraints in mind, and iterate in small, measurable steps.

Modularization (v1.0.1+) — Quick Notes
- Entry point/orchestrator:
  - maps/epic-diverse-huge.js remains the entry point; it orchestrates the pipeline by calling modular layers.
- Layers:
  - Landmass: maps/layers/landmass.js (createDiverseLandmasses)
  - Coastlines: maps/layers/coastlines.js (addRuggedCoasts)
  - Islands: maps/layers/islands.js (addIslandChains)
  - Climate — Baseline: maps/layers/climate-baseline.js (buildEnhancedRainfall)
  - Climate — Earthlike: maps/layers/climate-refinement.js (refineRainfallEarthlike)
  - Biomes: maps/layers/biomes.js (designateEnhancedBiomes)
  - Features: maps/layers/features.js (addDiverseFeatures)
  - Placement: maps/layers/placement.js (wonders, floodplains, snow, resources, starts, discoveries, fertility, advanced starts)
- Climate Story (tags + tagging):
  - Tags: maps/story/tags.js
  - Tagging: maps/story/tagging.js (HotspotTrails, RiftValleys)
- Config/Utils:
  - Tunables: maps/config/tunables.js (STORY_ENABLE_* and STORY_TUNABLES)
  - Dev logger: maps/config/dev.js (see below)
  - Shared utils: maps/core/utils.js (clamp, inBounds, storyKey, adjacency, feature lookups)

Dev Logger (optional; off by default)
- File: maps/config/dev.js
- Toggles (enable for a local debugging session, then revert):
  - DEV.ENABLED: master switch
  - DEV.LOG_TIMING: per-layer timings (used around major passes in epic-diverse-huge.js)
  - DEV.LOG_STORY_TAGS: prints StoryTags counts (logged after tagging, before island chains)
  - DEV.RAINFALL_HISTOGRAM: prints coarse rainfall histogram over land (logged before placement)
- No-ops when disabled (negligible overhead). Keep disabled for release builds.