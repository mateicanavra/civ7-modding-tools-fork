# Appendix: Repo Wiring Inventory (Gameplay Domain Pre-Refactor)

*This appendix catalogs the current (pre-refactor) map generation pipeline elements related to gameplay. It lists the stages and steps that comprise the Narrative and Placement portions of the pipeline, along with their roles and any notable implementation details. This inventory will guide the refactoring by showing what needs to be merged or modified under the new Gameplay domain.*

## Narrative Stages and Steps (Pre-Refactor)

In the existing pipeline, **“Narrative” stages** are interleaved among the physics stages to inject story-driven context. These stages are currently owned by a loose Narrative domain. They primarily produce overlays and make minor adjustments for playability. The standard sequence includes multiple narrative stages:

- **`narrative-pre` stage:** Runs early in the pipeline (after initial world shape is established, likely after Foundation/Morphology). Key steps in this stage:
  - *Generate Hotspots:* Identifies clusters of islands or volcanic regions (using plate data from Foundation) and adds **HOTSPOTS** overlays to mark these significant areas.
  - *Generate Rifts:* Detects major divergent boundaries or rift valley locations (based on tectonic layout) and adds **RIFTS** overlays along those lines. This may involve analyzing the plate boundary graph for spreading centers.
  - *Mark Plate Margins:* Tags certain plate boundary areas (coasts, subduction lines) with **MARGINS** overlays, denoting edges of continental plates or other significant margins.
  - *(Possibly)* *Preliminary Orogeny:* If any early mountain/tectonic context is needed, an initial pass might mark high-uplift areas (though significant mountain info may only be available after Morphology).

- **`narrative-mid` stage:** Runs after some physical refinement (possibly after Morphology or between Hydrology phases). It further refines the narrative context:
  - *Generate Orogeny Motifs:* Using the post-erosion terrain from Morphology, identify major mountain ranges or old vs. young mountains, adding an **OROGENY** overlay or annotating hotspot overlays with intensity (this gives story context like “ancient mountains”).
  - *Generate Corridors (pre-river):* Analyze the terrain for passes or low-elevation corridors through mountain chains **before rivers carve their paths**. Add **CORRIDORS** overlays highlighting these paths (which can influence where rivers might go or where climates might pass).
  - *Misc Playability Adjustments:* Possibly steps like marking coastal choke-points or other strategic map features if needed, although these might not exist in current code.

- **`narrative-swatches` stage:** Runs after climate simulation (Hydrology/Climate) and before final ecology or placement:
  - *Generate Climate Swatches:* Aggregates climate results (temperature bands, rainfall patterns) into broader **SWATCHES** overlays, which label regions with narrative-friendly tags (e.g. “tropical belt”, “arid zone”, “polar circle”). These swatches summarize biome trends in a way that can be used for storytelling or even for biases in resource placement.
  - *Environmental Motifs:* Potentially marks special environmental stories (like “ancient lakebed” or “glacial path”) if any such concept exists, though this may be more speculative. The main known function is climate zones.

- **`narrative-post` stage:** Runs toward the very end of generation (after rivers and possibly after Ecology):
  - *Generate Corridors (post-river):* Updates or adds **CORRIDORS** overlays now that river networks are known. For example, if rivers carved new valleys through mountains, ensure those get marked as corridors. Also, identify any canyon-like features or newly isolated areas post-river carving.
  - *Finalize Playability Tags:* Any final narrative adjustments for playability. A known example is **floodplain marking**: the narrative-post (or placement planning) might tag river tiles that should become floodplains for Gameplay reasons (though in practice, floodplain assignment is handled at placement; see below).
  - *Cleanup/Normalization:* Ensures all overlays in the container are consistent and ready for consumption. This might involve merging overlay segments or capping certain values. (E.g., combine corridor segments into one if they align, or ensure no hotspot is duplicated.)

**Artifact and data flow:** All the above narrative steps publish to the **`overlays` artifact** (see the Node Context Packet doc for details). The sequence is designed such that:
- The overlays container is created at narrative-pre and carried forward.
- Each subsequent narrative stage reads the existing overlays (if needed) and appends new ones relevant to that stage’s timing.
- By narrative-post, the overlays artifact contains: `hotspots`, `rifts`, `margins`, `orogeny` (if separate), `corridors`, `swatches`, and potentially other motif lists (e.g., “volcanism” areas or “fracture zones” if those were distinguished).
- No physical world arrays (terrain, climate, etc.) are directly modified by these steps, **with one historical exception**: the **“paleo climate artifact”** (if present) in narrative-post, which attempted to simulate ancient climate effects by altering climate data. That was a hack in legacy code violating domain boundaries; it will be removed or moved under Hydrology in the refactor.

**Code locations:** Pre-refactor, narrative logic lives in modules under something like `/src/domain/narrative/`. For instance, one might find `ops` or utility files like `hotspots.ts`, `rifts.ts`, etc., and stage definitions under `/src/recipes/standard/stages/narrative-*`. These will be scanned in Phase 1 to capture the exact functionality implemented.

## Placement Stage and Steps (Pre-Refactor)

The **Placement** stage is the final stage of the map generation recipe. It is currently part of a separate Placement domain. Its job is to take the fully generated world (terrain, rivers, biomes, plus overlays from Narrative) and perform all game-specific placements. In the legacy structure, the Placement stage typically includes:

- **Planning step (`derive-placement-inputs`):** This is a preparatory step (might not have an explicit name in code, but logically it occurs just before the actual placement call). In current code, this is where various “plan” operations are executed:
  - `planStartPositions` – Determines the start plots for each major civilization. It likely uses the final terrain/biome map and any start bias data to score potential start locations, then picks one for each civ ensuring adequate spacing. The output would be a list of chosen start coordinates.
  - `planAdvancedStartRegions` – Determines an extended region around each start (for the advanced start area). Official scripts did this (marking a larger area as the civ’s homeland). The mod’s current code may not explicitly implement this, or it might be combined in `planStartPositions`. If separate, it identifies a set of surrounding tiles (e.g., 3-5 tiles radius or based on landmass) for each civ to be tagged as that civ’s “starting region.”
  - `planNaturalWonders` – Chooses locations for natural wonders. Likely filters candidate tiles (e.g., certain wonders require specific terrain or climate) and picks the required number based on map size or configuration. It might also ensure they’re spaced out and not on top of player starts. Output: list of wonder placements (wonder type and tile).
  - `planResources` – Depending on approach, this either delegates entirely to engine or adjusts parameters for resource generation. The Civ7 engine has a built-in resource distribution (`generateResources`). The mod might simply call that, or it might prepare some inputs (like marking certain tiles off-limits or deciding resource quantity scaling). In Civ6 mod, often resources were mostly engine-driven, so here planning might be minimal.
  - `planFloodplains` – Scans river tiles and marks where floodplains should be placed (e.g., along desert rivers or wherever criteria meet). In Civ7 scripts, floodplains are generated by code after rivers. The plan likely includes a list of river edges or adjacent tiles that should receive the Floodplain feature.
  - `planGoodyHuts` (discoveries) – Possibly identifies positions for goody huts. The Civ7 script had a separate discovery generator that placed these structures in appropriate places (not too close to starts, certain terrains). If implemented, the planning step would pick tiles for a given number of “tribal village” improvements.
  - `planIslandAdjustments` – A specific tweak: identify one-tile islands that have strategic resources which are not supposed to spawn there according to rules. The official script would remove those resources and place a different improvement (like a unique island structure). The plan would mark those tiles (e.g., “remove resource at X, instead place Y”). This is a niche but noteworthy rule in Civ7.
  - Other minor plans: e.g., `planSnowEffects` to mark permanent snow if any such concept (Civ7 introduced a notion of layered snow that could act as a modifier; the script adds a plot effect on snow tiles in the far south/north).

  All these operations produce a consolidated **placement plan** (the PlacementInputs artifact described in the Node Context Packet). In legacy code, these might just set data on the context for the next step, but conceptually it’s collecting all decisions.

- **Apply step (`placement` proper):** This is the final execution:
  - Calls `adapter.assignStartPositions` with the chosen start coordinates (passing along start bias satisfaction info if needed, although likely just the positions).
  - Calls `adapter.setAdvancedStartRegion` for each civ’s region, if such a function exists (or maybe `assignStartPositions` already covers it by engine design).
  - Calls `adapter.generateResources` (which internally places strategic/luxury resources according to game rules and the map settings). In Civ7’s base script, this is a single call that populates resources globally. It uses internal game tables (like MapIslandBehavior, Start Bias data, etc.) to adjust distribution. Because the mod can’t directly control where each resource goes in Phase A, this call is critical.
  - Calls for placing natural wonders: Possibly the engine’s resource generator also places natural wonders, or there might be a separate engine function like `adapter.addNaturalWonder(wonderType, location)`. If separate, the mod would iterate over planned wonders and call it for each.
  - Calls for discoveries (goody huts): If the plan identified specific tiles, it would call `adapter.addDiscovery(location)` for each. If no such adapter exists yet, this is a gap to fill.
  - Floodplains: Calls a function to add floodplain features on the designated river tiles. This could be something like `adapter.addFeature("FLOODPLAINS", location)` repeatedly, or it might set a flag via a map utility. In Civ7, floodplains might be added via a TerrainBuilder method after terrain is placed.
  - Island resource replacements: For each marked island tile, the apply step would remove the disallowed resource (maybe via `adapter.removeResource(tile)` if available) and then place the alternative (perhaps a dummy district or improvement) via another call. Civ7 used `MapCities.removeRuralDistrict` and `placeRuralDistrict` in the script for this. In the mod, we would need an equivalent if we choose to support this rule.
  - Snow effects: For any planned permanent snow tile, call something like `adapter.addPlotEffect("PERMA_SNOW", tile)` if available, to simulate the gameplay effect of permanent snow cover.

  As these calls are made, the engine applies the changes to the map. The mod might gather results (like how many resources were actually placed, or which tiles got what) into a PlacementOutputs for logging. If something fails (e.g., the engine couldn’t place a wonder because the tile became invalid), the apply step should ideally catch that and log it or adjust if possible.

- **Ordering considerations:** The landmass region labeling (homelands vs distant lands) is performed **right before** resource generation in the official pipeline. In our mod, we will incorporate that in the Placement stage as well (likely as the very first part of the apply step, or even as a tiny separate step just prior to placement). That ensures that when `generateResources` runs, the engine knows which landmass is “primary” vs “secondary” and can allocate resources accordingly (Civ7’s resource rules differ for homelands vs distant continents).

**Code locations:** Pre-refactor, placement logic resides in `/src/domain/placement/` (for ops like planStarts, etc.) and the stage config in something like `/src/recipes/standard/stages/placement.ts`. In that stage file, one would see it requires artifacts from narrative/ecology (like overlays or biome data) and then calls the plan ops followed by engine calls.

Notably, the **EngineAdapter** integration code is typically under something like `/src/engine/adapter.ts` or similar, which implements functions for the above calls. Part of the refactor inventory is to ensure that for each needed engine call, an adapter method exists (or to note where one is missing).

## Summary of Pre-Refactor Wiring

- **Stages to be absorbed into Gameplay domain:** `narrative-pre`, `narrative-mid`, `narrative-swatches`, `narrative-post`, and `placement` stages are all currently implemented as separate units. Post-refactor, these will all be Gameplay-owned stages (likely renamed or at least re-documented under Gameplay).
- **Ops and functions:** We have a set of planning ops (planStarts, planWonders, etc.) and overlay generation functions that will be integrated into Gameplay. These will become the internal operations of the Gameplay domain. Each will need to be reviewed (Phase 1 will document their current behavior and interfaces).
- **Artifacts and context:** Key artifacts like `overlays`, `placementInputs`, and any placement-related context (e.g. an artifact for “chosen start plots” if it exists separately) are identified and will be formally defined in the new domain. We expect to define new schema/types for them in the Gameplay module.
- **Engine calls:** Points in the code where we call into the EngineAdapter (start positions, resource gen, etc.) are the critical integration points. In the refactored architecture, these remain at the end of the pipeline, but we will likely wrap them in clearer interfaces or ensure they are only called in the designated apply step.

By cataloging these elements, we ensure the refactor has a complete map of what to handle. The **goal is to maintain equivalent functionality**: after refactoring, the mod should still place starts, resources, wonders, etc. the same way (or better, if we fix bugs), just through a cleaner, unified Gameplay module. This inventory will be referenced during Phase 3 (implementation planning) to methodically migrate each piece into the new structure or decide on elimination/replacement for each legacy element.