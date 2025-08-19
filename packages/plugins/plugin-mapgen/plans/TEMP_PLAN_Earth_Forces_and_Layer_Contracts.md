# TEMP PLAN — Earth Forces and Layer Contracts

Owner: Map Systems
Status: Draft (temporary planning document)
Scope: v1.2+ exploration (low-risk phased rollout); no heavy simulation

1) Purpose

Define:
- Clear layer contracts (inputs/outputs/order) for the current pipeline so dependencies remain explicit and maintainable.
- A phased, lightweight “Earth Forces” foundation (WorldModel) that precomputes coherent global fields (plates, winds, currents, pressure) to drive tagging, climate, and corridor selection in a controlled way without heavy simulation or breaking vanilla compatibility.

2) Snapshot — Current Pipeline and Dependencies

Orchestrated order (maps/epic-diverse-huge.js):
1. Start Sectors
   - chooseStartSectors → start-sector grid for later placement.
   - Outputs: sector grid and optional equatorial bias for human.
   - Reads: map size (mapInfo), globals, utilities.

2. Landmass
   - createDiverseLandmasses → 3-band continents with jitter/curvature.
   - Outputs: initial land/water mask.
   - Reads: globals (seams/polar/ocean), size.

3. Coasts + Margins
   - expandCoasts (base)
   - storyTagContinentalMargins → tags: StoryTags.activeMargin, StoryTags.passiveShelf.
   - addRuggedCoasts → margin-aware bay/fjord shaping.
   - Outputs: refined coasts; margin tags consumed downstream.
   - Reads: coastal tiles; StoryTags.activeMargin/passiveShelf.

4. Climate Story (pre-Islands tags)
   - storyTagHotspotTrails → tags: hotspot.
   - storyTagRiftValleys → tags: riftLine, riftShoulder.
   - storyTagOrogenyBelts → tags: mountain belts, windward/lee cache.
   - storyTagContinentalMargins (re-run for consumers)
   - Outputs: sparsely tagged motifs used by islands/refinement/biomes.
   - Reads: elevation, latitude, water mask.

5. Strategic Corridors (pre-Islands)
   - storyTagStrategicCorridors("preIslands") → sea lanes, island‑hop, land‑open; assigns kind/style.
   - Outputs: StoryTags.corridorSeaLane/IslandHop/LandOpen + style metadata.
   - Reads: water mask, coasts, hotspots, rift shoulders.

6. Islands
   - addIslandChains → respects sea-lane avoidance and margins; hotspot‑biased.
   - Outputs: small offshore islands; hotspot paradise/volcanic tagging for features/climate.

7. Elevation + Water (base)
   - addMountains, addVolcanoes, generateLakes, addHills, buildElevation.
   - Outputs: elevation terrain finalized.

8. Climate A (baseline)
   - buildEnhancedRainfall → band-blended rainfall with local coastal/orographic bonuses and noise.

9. Swatches + Paleo
   - storyTagClimateSwatches → one macro swatch with soft edges; optionally runs Paleo humidity overlays (deltas/oxbows/fossil channels).

10. Rivers (base)
   - modelRivers / validate / defineNamedRivers.

11. Strategic Corridors (post-Rivers)
   - storyTagStrategicCorridors("postRivers") → river chains + style metadata.

12. Climate B (earthlike refinement)
   - refineRainfallEarthlike → water gradient, upwind barrier dryness, river corridor greening, rift humidity, orogeny windward/lee, hotspot microclimates.
   - Requires: rivers, rifts, orogeny, hotspots.

13. Biomes (nudges)
   - designateEnhancedBiomes → tundra restraint; tropical coasts; river valleys grassland; rift shoulder bias; corridor land/river style-aware nudges.
   - Reads: rainfall, tags (rifts/corridors), latitude, elevation.

14. Features (validated)
   - addDiverseFeatures → paradise reefs and passive shelf reefs; volcanic vegetation; density tweaks (rainforest/forest/taiga).
   - Reads: StoryTags.hotspotParadise/Volcanic, margins.

15. Placement
   - runPlacement → wonders +1, floodplains, snow, resources, discoveries, starts, fertility.
   - Reads: start sectors, landmass windows; recalculates areas/water data.

3) Layer Contracts — Summary

Notation:
- Inputs: data read (engine surfaces, StoryTags, world fields).
- Outputs: data written (engine surfaces, StoryTags).
- Order: must run after/before.

A) Landmass (layers/landmass.js)
- Inputs: map size, globals.
- Outputs: initial land/water tiles.
- Order: first terrain stage; before coasts/margins.
- Consumers: all downstream layers read land/water.

B) Margins (story/tagging.js: storyTagContinentalMargins)
- Inputs: coastal land/water.
- Outputs: StoryTags.activeMargin, StoryTags.passiveShelf.
- Order: after expandCoasts; before rugged coasts/islands.
- Consumers: coasts/islands/features.

C) Coasts (layers/coastlines.js)
- Inputs: StoryTags.activeMargin/passiveShelf; corridor sea-lane policy (soft/hard).
- Outputs: bay/fjord coast edits (conservative).
- Order: after margins; before islands.

D) Climate Story: Hotspots/Rifts/Orogeny (story/tagging.js)
- Inputs: elevation, water, latitude.
- Outputs: sparse tags: hotspot/riftLine/riftShoulder/orogeny windward/lee.
- Order: before islands (hotspot bias); before climate refinement.

E) Strategic Corridors (story/corridors.js)
- Inputs: water/coasts/hotspots/rift shoulders/rivers (post-rivers).
- Outputs: StoryTags.corridor* sets; style metadata; dev logs.
- Order: sea/land/islandHop pre-Islands; river post-Rivers.
- Consumers: coasts (policy & edge effects), islands (avoid lanes), biomes (corridor style nudges).

F) Islands (layers/islands.js)
- Inputs: StoryTags.hotspot; StoryTags.corridorSeaLane; margins.
- Outputs: island tiles; hotspot paradise/volcanic tags.
- Order: after corridors pre-Islands.

G) Climate Baseline (layers/climate-baseline.js)
- Inputs: latitude bands, elevation/coast adjacency.
- Outputs: rainfall base field.
- Order: before rivers and refinement.

H) Swatches & Paleo (story/tagging.js)
- Inputs: rainfall/latitude/elevation; optional orogeny cache (for mountainForests).
- Outputs: rainfall deltas; optional paleo overlays.
- Order: after baseline, before rivers for blended effect.

I) Rivers (engine)
- Inputs: rainfall/elevation.
- Outputs: river network; named rivers.
- Order: before refinement and post-rivers corridors.

J) Climate Refinement (layers/climate-refinement.js)
- Inputs: rivers; StoryTags (rifts, orogeny windward/lee, hotspots); coastal distances; elevation; latitude.
- Outputs: rainfall deltas per refinement passes; clamped [0,200].
- Order: after rivers.

K) Biomes (layers/biomes.js)
- Inputs: rainfall/elevation/latitude; StoryTags (rift shoulders, corridors with kinds/styles).
- Outputs: biome types (nudges only; base-compatible).
- Order: after refinement and corridors tagging.

L) Features (layers/features.js)
- Inputs: biomes/terrain/water; StoryTags (hotspot paradise/volcanic, margins).
- Outputs: validated features (reefs/forests/taiga/jungle tweaks).
- Order: after biomes.

M) Placement (layers/placement.js)
- Inputs: finalized terrain/biomes/features; mapInfo; start sectors.
- Outputs: wonders/resources/discoveries/starts etc.
- Order: last.

4) Gaps and Improvements in Dependency Clarity

- Today’s clarity comes mainly from ordering in epic-diverse-huge.js and local comments; add “Layer Contracts” to DESIGN.md with Inputs/Outputs/Order for each layer (A–M).
- Tag lifecycle: state that StoryTags are cleared/reset at key points and listing who writes/reads each set (including corridor style metadata).
- Climate refinement: document assumption “requires rivers, rifts, orogeny” explicitly in the contract.

5) Proposed Foundation — Earth Forces (WorldModel)

Objective: precompute lightweight global “world fields” for coherence, not heavy sim.
- Location: maps/world/model.js (new); exported singleton WorldModel.
- Fields (per-tile, sparse or dense arrays):
  1) Plates
     - plateId: Int16Array (Voronoi partition of N seed plates)
     - plateBoundaryStrength: Uint8Array (normalized distance to nearest plate boundary)
     - boundaryType: Uint8Array enum { convergent, divergent, transform }
     - tectonicStress, upliftPotential, riftPotential: Float32Array 0..1
     - shieldStability: Float32Array 0..1 (distance to plate interior)
  2) Mantle Pressure
     - pressure: Float32Array 0..1 (sum of a few Gaussian bumps + very-low-frequency noise aligned to plate vectors)
  3) Wind
     - windU, windV: Float32Array (zonal baseline + jet stream streaks + orographic perturbations)
  4) Ocean Currents (water tiles)
     - currentU, currentV: Float32Array (equatorial westward, western boundary, subpolar recirculation, basin gyres)

Config additions (map_config.js → worldModel):
- plates: { count, axisAngles[], convergenceMix, seedJitter, interiorSmooth }
- wind: { jetStreaks, jetStrength, variance, coriolisZonalScale }
- currents: { basinGyreCountMax, westernBoundaryBias, currentStrength }
- pressure: { bumps, amplitude, scale }

Insertion point:
- Phase 0: compute WorldModel after Landmass/ExpandCoasts (so basins/coasts exist); fields remain read-only to other layers initially.

6) How WorldModel Drives Existing Layers (Opt-in, No Heavy Changes)

Tagging
- Rifts: replace random rift seeding with paths along divergent plate boundaries (high riftPotential).
- Orogeny belts: draw belts where upliftPotential/tectonicStress are high (convergent boundaries).
- Margins: reinforce active/passive based on boundaryType for long coherent segments.

Climate
- Replace simple zonal winds in refinement: use local windU, windV to evaluate upwind barriers (cast rays along vectors).
- Water gradient: damp/boost humidity where warm/cold currents meet coasts (small deltas; clamped).

Coasts/Islands/Features
- Fjords/bays: bias slightly near convergent boundaries (steeper passive/active cues).
- Reef chance: bias along passive shelves with warm currents (coastal).
- Island chains: subtle bias along transform/divergent oceanic boundaries (corresponds to hotspot trails).

Corridors
- Sea-lane scoring adds a positive term for alignment with current vectors and for minimum channel width along flow.
- Land-open selection can prefer shield interiors (stable cores) or rift shoulders depending on style policy.

Landmass (optional, later)
- Small curvature/banding adjustments based on plate axes (guardrails to preserve true oceans and vanilla expectations).

7) Phased Plan

Phase A (Foundational Fields + Tagging/Wind Integration)
- Add WorldModel singleton and config (worldModel.*).
- Compute:
  - Voronoi plates & boundaryType, tectonicStress/uplift/riftPotential.
  - WindU/V: zonal + jet streams; simple orographic perturbation (base on upliftPotential).
- Wire consumers:
  - storyTagRiftValleys → follow divergent boundaries (limit to N segments; size-aware).
  - storyTagOrogenyBelts → use upliftPotential for belts; keep cache for windward/lee.
  - refineRainfallEarthlike → replace zonal dx with windU/V vector traversal in hasUpwindBarrier; keep same clamp and steps.
- Logs: plate counts, boundary length by type, wind magnitude histogram.

Phase B (Currents + Coastal Humidity/Sea-lane Scoring)
- Compute currentU/V (basin-wise + gyres; simple masks from land/water).
- Refinement: small coastal humidity bias using current direction/magnitude (warm vs cold heuristic).
- Coasts/Islands: slight fjord/bay bias near convergent boundaries; reef multiplier near warm passive shelves.
- Corridors: sea-lane candidate scoring adds a current-alignment term; spacing preserved.

Phase C (Pressure & Optional Terrain/Style Coupling)
- Compute mantle pressure; optionally bias hill density (very lightly).
- Style selection for land corridors: use avg elevation, rainfall, relief, and plate proximity to pick canyon/plateau/flatMtn/desert/grass styles (we already added heuristics; refine with WorldModel fields).
- Optional: tiny landmass curvature by plate axes (strict guardrails).

8) Risks and Mitigations

- Overstacking/overlap (motifs + corridors + swatches)
  - Mitigation: composition caps (diminishing returns) and per-layer policy strengths. Start with no stacking changes; add cap if we observe amplifications.
- Performance
  - Mitigation: O(width×height) computations with constant-time local checks; avoid flood fills; small fixed number of plates and jet streaks.
- Compatibility
  - Mitigation: no changes to engine APIs; optional, opt-in influences; rainfall strict clamp [0,200]; features validated; lanes preserved.

9) Acceptance Criteria (for Phase A/B)

- Rifts: long, coherent lines following plausible boundaries; shoulders remain narrow; no noisy zig-zag.
- Orogeny: windward/lee reflect belts produced from upliftPotential; rain shadow patterns remain believable and clamped.
- Winds: replacing zonal dx with windU/V yields similar or better coherence (no perf regressions).
- Currents (Phase B): subtle coastal humidity biases; no saturation; reefs gently concentrated near warm shelves; lanes do not choke.

10) Diagnostics and Dev Logging

- New logs:
  - WorldModel summary (plates count, boundary type lengths).
  - Wind/current magnitude histograms; optional quiver-like ASCII sampler.
- Existing:
  - StoryTags summary includes new rift/orogeny counts; corridor style distribution summary; ASCII overlay.

11) Layer Contracts — Minimal Doc Stub (to add to DESIGN.md)

For each layer (A–M above), include:
- Inputs (engine surfaces, StoryTags, WorldModel fields).
- Outputs (engine changes, StoryTags).
- Order constraints (runs-before, runs-after).
- Guardrails (O(W×H), clamps, validation).
- Example consumers (which layers read these outputs).

12) Open Questions / Decision Points

- Where to compute WorldModel precisely in the pipeline?
  - Option 1 (recommended): after Landmass/ExpandCoasts before Margins (so coasts/basins exist; tags will immediately benefit).
- Plate count and axes defaults per map size:
  - Suggest 6–10 plates on Huge; axisAngles randomized but with a seed.
- How strong should currents/winds modulate rainfall?
  - Start with tiny deltas (≤ ±6) and clamp; expose policy multipliers in config.
- Should islands favor transform/divergent oceanic boundaries more strongly?
  - Start with subtle bias; keep island size/spacing caps conservative.

13) Rollout Plan and Revert Strategy

- Implement Phase A behind a master toggle worldModel.enabled (default true for dev only; off for release until stabilized).
- Keep quick kill-switch; if regressions occur, disable influences while keeping WorldModel code paths inert.
- Maintain minimal diffs to existing layer signatures; use read-only world fields to avoid tight coupling.


— End of TEMP PLAN —