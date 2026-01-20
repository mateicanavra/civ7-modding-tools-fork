# Appendix: Civ7 Gameplay Levers and Engine Adapter Triage

*This appendix documents the **gameplay-related “levers”** present in Civilization VII’s map generation – the key features and knobs that the game’s scripts use to shape the playable map – and evaluates our mod’s EngineAdapter coverage for each. It identifies where the mod already has integration points and where we need to add or adjust adapter functions to fully support the Gameplay domain’s responsibilities.*

## Inventory of Gameplay MapGen Levers in Civ7

Based on Civ7’s official map scripts and data, the following are the major gameplay elements managed during map generation:

- **Major Civilization Start Placement:** The scripts allocate starting plots for each major civ (`assignStartPositions` in the base script). This involves applying **start bias** rules (preferences such as “this leader prefers to start near forests” or “on a coast”) which are defined in the game data (`StartBias` entries in leaders.xml). It also ensures minimum distances between starts. *Lever:* The ability to pick and assign start locations according to rules.
- **Advanced Start Regions:** After picking start plots, the script defines an **expanded region** around each start (`assignAdvancedStartRegions`). This gives each civ an initial territory (for example, all land within X tiles becomes part of their “start region”). This is used by the game to, e.g., keep certain resources out of starting areas or to control early exploration. *Lever:* Control of how large and which shape each civ’s starting area is.
- **Natural Wonder Placement:** The script places **Natural Wonders** on the map (`natural-wonder-generator.js`). It respects a setting for number of wonders (e.g., map option “Random Wonders: 2”) and has rules ensuring wonders appear in valid terrains and are spaced out. *Lever:* Choosing which wonders and where they appear for strategic and aesthetic effect.
- **Resource Distribution:** The game populates **Strategic, Luxury, and Bonus Resources** via a resource generation routine (`resource-generator.js` calling `ResourceBuilder.getGeneratedMapResources`). This uses both map script logic and data tables (like `MapIslandBehavior` for tweaking resource density on certain map types). For instance, certain map types might have rules for extra resources on islands or specific placement of new resource types. *Lever:* Adjusting resource placement patterns (density, clustering, type frequency) on a per-map basis.
- **Discoveries (Goody Huts) Placement:** The script places **Discoveries** (villages that grant bonuses, akin to goody huts) via a dedicated generator (`discovery-generator.js`). It uses game configuration (`DiscoverySiftingImprovements` table in narrative-sifting.xml) to determine what improvement represents a “discovery” and places them with some randomness, ensuring they aren’t too close to player starts. *Lever:* Inclusion and distribution of exploration rewards on the map.
- **Post-Placement Map Adjustments:** Several smaller but important adjustments happen towards the end of generation:
  - **Floodplains Generation:** After rivers are drawn, the script creates **Floodplain** features along appropriate river segments (e.g., in desert tiles adjacent to a river). This ensures those river tiles get the floodplain feature which affects yields and gameplay.
  - **Fertility & Water Table Recalculation:** The script calls `FertilityBuilder.recalculate()` and `TerrainBuilder.storeWaterData()` once terrain, features, and resources are placed. These functions compute values used by the game for scoring starts and other purposes (e.g., how fertile each plot is, which plots count as water/coastal for city placement etc.). *Lever:* Ensuring the game’s evaluative metrics are updated to account for the final map state.
  - **One-Tile Island Resource Replacement:** The base script checks for single-tile islands that ended up with a strategic resource. If found, it removes such resources and places a special **“rural district”** on that island instead (`map-utilities.js` does `removeRuralDistrict` / `placeRuralDistrict`). This is a design lever to avoid certain balance issues (like one-tile islands holding oil which normally requires territory to use). *Lever:* Altering specific tiles post-generation for balance.
  - **Permanent Snow Effects:** In polar regions, the script adds a **permanent snow/ice effect** on certain tiles (`snow-generator.js` using `MapPlotEffects.addPlotEffect`). This is presumably to simulate thick ice that permanently reduces yields or movement, enforcing a harsher polar environment. *Lever:* Adding special tile effects for thematic and gameplay reasons (beyond standard terrain).
- **Data-Driven Parameters:** Many of the above levers are controlled or influenced by external data rather than hardcoded:
  - **Start Bias Data:** Defines which terrains/features each civ favors or avoids (gameplay lever for map balance).
  - **Resource/Map Settings:** The map script can read settings like map size, number of players, or specific map options (e.g., “Sparse Resources”) to tweak distribution.
  - **Discovery Improvements Table:** Dictates what improvement is placed for goody huts and possibly distribution rules.
  - **Map Type Behaviors:** Some values in data (like `MapIslandBehavior`) tune things like resource density or region splitting per map type.

Our Gameplay domain must either utilize these levers via the engine or replicate their effect. The refactor does not change these gameplay concepts; it consolidates how we interact with them.

## Engine Adapter Integration: Current Support vs Needed

The **EngineAdapter** in the mod serves as the bridge to Civ7’s game engine functions. We need to ensure it covers all the interactions for the above levers. Below is a list of relevant adapter functions and notes on their status:

- **Start Positions:** 
  - `EngineAdapter.assignStartPositions(playerStartData)`: **Exists.** This function is used to pass the chosen start positions to the game. The mod already uses this (in the legacy placement stage) to apply start locations. We will continue to use it in Gameplay. We need to verify it can also handle advanced start regions or if there’s a separate call.
  - `EngineAdapter.assignAdvancedStartRegions(regionData)`: **Likely Missing (To Add).** If Civ7’s API has a separate call like `StartPositioner.setAdvancedStartRegion`, our adapter may not have explicitly implemented it yet. We likely need to introduce a method to send the computed region (a set of plots or a radius) for each player to the engine. This could be as simple as calling the engine for each player after starts are assigned. The interim solution (since advanced regions are mainly used internally by engine for resource allocation) might be to rely on engine defaults (which often assume largest landmass as homelands automatically). However, to be precise, we’ll implement this call.
- **Landmass Region ID (Homeland/Distant):**
  - `EngineAdapter.setLandmassRegionId(landmassId, regionConstant)`: **To Add.** The engine likely has an internal representation of continents (landmass IDs) and expects them labeled (maybe by a constant like “RegionWest” vs “RegionEast” or numeric codes). We will add an adapter function that, given a landmass or tile list and a region classification, calls the engine to label those tiles appropriately. The design (as per issue) is to avoid magic numbers; ideally the engine provides a function or we fetch constants from it (e.g., get an ID for “HOMELAND” region and one for “DISTANT”). This adapter function will be called in our Gameplay placement sequence.
- **Resource Generation:**
  - `EngineAdapter.generateResources()`: **Exists.** This triggers the engine’s built-in resource placement. The mod uses this currently at the end of mapgen. We will keep using it in Phase A. One thing to verify is that the engine call respects things like the landmass region labeling (which it should, if the labeling is done beforehand). Also, ensure it’s called after we potentially set any configuration (like map size or resource setting) – but those are usually fed in through the MapGenerator context anyway.
  - _Potential Future:_ If in Phase B we skip engine allocation for more control, we’d introduce something like `EngineAdapter.placeResourceAt(x,y, type)` but that’s not needed now. We just note that `generateResources` must be invoked exactly once at the right time.
- **Natural Wonders:**
  - The engine might place wonders as part of `generateResources` (some Civ versions treat wonders as part of resource placement). But Civ7’s script did wonders separately, suggesting an API:
  - `EngineAdapter.addNaturalWonder(wonderType, plot)` or a variant. **Status:** Possibly missing. If `generateResources` does not automatically place wonders according to map settings, we will need to call something. We should check if the engine expects a count or specific placements. 
    - It’s possible `generateResources` actually covers them using map settings (`RequestedNaturalWonders`). If so, we may rely on engine to randomly place the specified number of wonders. However, the Civ7 script manually placed wonders, which implies we might want to emulate that for deterministic selection.
    - For now, we can plan to implement an adapter method if needed. If engine lacks a straightforward function to place a specific wonder, we might still call an internal function or trick (maybe the engine can accept a predetermined list).
    - **Phase A approach:** Let the engine handle it with its standard approach (if `generateResources` does wonders when given `RequestedNaturalWonders` count, we set that count and call generateResources). 
    - If insufficient, we fall back to: pick wonders in our planning step and call something to place them. This might require exploring the engine API further, possibly out of scope for automated refactor (could require native call not exposed via current adapter).
- **Discoveries (Goody Huts):**
  - `EngineAdapter.addDiscovery(plot)` or `addGoodyHut(plot)`: **Likely Missing.** Civ7’s script uses `MapConstructibles.addDiscovery(...)` to place a discovery at a plot. Our adapter probably doesn’t have a direct method for this yet. We will need to add one if we intend to explicitly place huts. Alternatively, if `generateResources` or some other engine routine also places huts (some Civ engines did not automatically place huts without script, hence the script exists), we probably must script it.
  - Implementation: This might involve calling into the game’s constructible system. We might add `adapter.addImprovement(improvementType, plot)` if a discovery is just a special improvement. But to keep it explicit, `addDiscovery` in adapter could find the proper improvement from game data (using the `DiscoverySiftingImprovements` mapping) and place it.
  - This is a to-do for Phase A if we want parity. If needed, we could temporarily skip placing discoveries (they’re not critical to core game start, but they are nice for exploration). However, to match the base game, we’ll try to implement it.
- **Floodplains:**
  - There might not be a direct engine call like “generateFloodplains”. Instead, in Civ6/7, floodplains are often placed by marking river edges with a feature. The script does this logically and then likely uses a general feature placement call.
  - If the engine has something like `TerrainBuilder.AddFloodPlains(riverEdge)`, we should expose it. More likely, `EngineAdapter.addFeature(featureType, plot)` could work if “Floodplains” is just a feature type that can be added to a tile adjacent to a river.
  - We need to check if our adapter currently has a generic feature placement (for forests/jungles, etc. – perhaps not, since those are normally auto-placed by Ecology). Possibly not yet implemented. We might implement something like `adapter.addFeature(featureTypeId, plotId)` for floodplains and any similar post-process feature.
  - Ensuring this is done after rivers exist is key (which it will be, since placement is last).
- **Fertility & Water Data Recalc:**
  - The engine likely has internal functions, possibly automatically invoked at the end of generation or via specific calls:
  - `adapter.recalculateFertility()` and `adapter.storeWaterData()` – **Possibly Missing** if not exposed. If the game doesn’t automatically do it on finalize, our script must call these.
  - We saw in Civ7’s base script explicit calls to these functions (which are engine global functions). We should provide adapter hooks to call them. This ensures that after all placements, we recalc yield scoring and mark water plots properly (for things like city placement rules).
  - Implementation might be straightforward if engine allows it via a global context call; we just need to route it through adapter for consistency.
- **Island Resource Replacement (Rural District trick):**
  - This one is tricky because it’s very game-specific. Civ7 script used specific game API calls (to city manager) to remove and place districts on one-tile islands.
  - We do not have an adapter method for “remove resource” or “place dummy district” currently.
  - For Phase A, we have options:
    - Implement minimal support: If we can identify the resource on a one-tile island, perhaps call `adapter.removeResourceAt(x,y)` if we create such a function. Removing a resource might or might not have a direct API – possibly by treating it as setting that plot’s resource to null (if engine provides).
    - Placing a “rural district” improvement – this is very specific and might not be trivial to call (as it involves city context). Possibly we skip actually placing a district (since it’s a purely aesthetic/gameplay tweak) and simply remove the resource to avoid the balance issue. The absence of the resource itself achieves the main goal (no free strategic on a tiny island).
    - Mark this as a low-priority gap. If time permits, implement at least resource removal.
    - This is a lever we acknowledge but might partially implement.
- **Snow Plot Effect:**
  - `adapter.addPlotEffect(effectType, plot)`: **Likely Missing.** If the game uses `MapPlotEffects.addPlotEffect("PermanentSnow", plotId)`, we’d need to call that. We can either implement a generic `addPlotEffect` or specifically add one for snow since that’s the known use case.
  - This again is a minor thing (doesn’t break core gameplay if omitted, except some flavor and maybe movement cost changes). But to mirror the base game:
    - We might expose a function that allows adding the effect given an effect type string or ID. The adapter would call the appropriate game function.
    - Ensure that this is done after all terrain/features are set.
    - It might require passing some parameters (the effect duration or type – permanent in this case).
    - We’ll likely implement a simple version for the specific known effect.
- **General Data Access:**
  - We should check if our adapter can read certain game info if needed (like retrieving constants or IDs for region types, improvement types for huts, feature IDs for floodplains, etc.). If not, we might need some getters:
    - e.g., `adapter.getLandmassId(name)` if region IDs are named,
    - `adapter.getImprovementType("Discovery")` to get the improvement index for huts,
    - Or these might be hardcoded via data parsing if the mod has the game data accessible.
  - The prompt for Landmass Region said “do not invent numeric IDs, get from adapter constants” – implying we might have an adapter method to fetch region IDs by name (WEST/EAST or HOMELAND/DISTANT).
  - We will ensure to follow that: probably implement functions like `adapter.getContinentRegionConstant("HOMELAND")` returning the engine’s constant for homeland region ID.

## Summary of Adapter Changes Needed

**Likely already present and will be used:**
- `assignStartPositions` – use as-is.
- `generateResources` – use as-is.
- Possibly `assignStartBiases` is not a function; biases are handled in our planning logic, not engine side.

**To implement or verify:**
- `assignAdvancedStartRegions` – new (if engine supports granular control).
- `setLandmassRegionId` – new.
- `addNaturalWonder` – possibly new, or confirm if engine does it via generateResources.
- `addDiscovery` (place goody hut) – new.
- `addFeature` or specific `addFloodplains` – new.
- `removeResourceAt` – new (for island fix).
- `addImprovement/ District` – perhaps skip or future (for island fix if doing district).
- `addPlotEffect` (for snow) – new.
- `recalculateFertility` & `storeWaterData` – new (if not auto-run).
- Utility getters for constants (landmass IDs, improvement IDs) – new.

We will coordinate with the EngineAdapter maintainers (or within our code) to add these. Each new adapter function should be tested during development to ensure it correctly triggers the expected engine behavior. The Phase 3 implementation plan will include tasks for adding these adapter methods, along with safeguards (e.g., if an adapter method cannot be implemented because the engine doesn’t expose that functionality, we’ll decide on a fallback or mark that aspect as unsupported for now).

By addressing this adapter to-do list, we ensure that the **Gameplay domain can fully leverage all Civ7 gameplay levers**. The map produced by our refactored pipeline will match the official game’s outcomes more closely and provide a solid foundation for any future enhancements.