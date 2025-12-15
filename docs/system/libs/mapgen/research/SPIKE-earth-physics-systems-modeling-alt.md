# Physics-Based Planetary Modeling for Procedural Generation

**Introduction & Overview:** We are building a data-driven task graph pipeline to generate an Earth-like planet for a 4X strategy game. The world is represented on a hexagonal grid (up to roughly 120 hexes wide by ~80 tall on the largest maps), which defines a Voronoi-like mesh of terrain cells. The pipeline is divided into sequential **Stages**, each responsible for a domain of physical processes (e.g., tectonics, climate, etc.). At the **Foundation** stage, we have already modeled plate tectonics and basic crustal composition; now we extend that rigor through subsequent layers. We will use a small number of discrete **snapshots** in time (1–at most) rather than continuous simulation, focusing computational effort on the most impactful long-term processes. For example, we might simulate an initial geologic epoch to form mountains and a later epoch after erosion – this gives context like "old, worn-down mountains" versus "new, rugged ranges" for downstream stages. Climate, however, will be treated as a quasi-steady state (less discrete eras, more a single equilibrium with seasonal patterns) since geological time scales matter more for topography than for atmospheric patterns. Each stage consumes the outputs of earlier stages (via a well-defined data API of input/output fields) and produces new data layers that make the world internally consistent and rich in detail. The guiding philosophy is **causal realism**: we approximate real physical cause-and-effect so that the world "makes sense" (intuitively responds to parameter "levers" in a physically plausible way) even though we are not solving full differential equations. For each domain below, we detail: real-world processes, how to stage their simulation (order and internal steps), inputs/outputs, key **levers** (global parameters that designers can tweak), and abstraction strategies for implementation.

## Geomorphology (The Shape of the Land)

**Real-World Domain:** Geomorphology covers all processes that shape the land's surface after the initial crust is formed. In nature, mountains arise from tectonic uplift and volcanism, then are sculpted by **erosion** over millions of years. Key erosion mechanisms include: **thermal weathering** (expansion/contraction from temperature swings and freeze-thaw cycles that break rock, causing steep cliffs to crumble), **hydraulic erosion** (water in motion – rainfall, rivers – mechanically wears down rock and transports sediment), and **glacial erosion** (slow-moving ice sheets scour and carve the land, creating U-shaped valleys and fjords). Wind (aeolian) erosion and mass wasting (landslides, gravity) also contribute. **Differential erosion** is crucial: different rock types erode at different rates, so "rock hardness" and stratification lead to varied terrain. For example, a hard caprock can protect softer layers beneath, forming mesas or buttes, and adjacent rock layers of unequal hardness create ridge-and-valley patterns. This is why some regions have jagged peaks while others have gentle hills – it depends on the resistance of the geology to weathering. Over time, eroded material is deposited elsewhere (**sedimentation**), building up plains, river deltas, and continental shelves. **Volcanism** also creates distinct landforms: **stratovolcanoes** (composite cones) are steep, conical mountains from explosive eruptions and ash/lava layering (e.g. Mount St. Helens), whereas **shield volcanoes** (common in hotspots like Hawaii) have gentle broad slopes from fluid lava flows. These volcanic mountains add new elevation that later erosion will act upon. In summary, geomorphology is the interplay of uplift (tectonic or volcanic) versus wearing down by climate and gravity, modulated by material properties.

**Simulation Staging (Order & Steps):** Geomorphology follows the tectonics "Foundation" stage. Once we have a base elevation map with tectonic features (mountain ranges, rift valleys, high and low crust types), we run a **Geomorphology stage** to refine the heightmap into a realistic terrain. This stage should occur _before_ climate modeling, because terrain will influence atmospheric circulation (mountains cast rain shadows, etc.). Internally, geomorphology can be broken into several steps performed in sequence:

### 1. Initial Elevation & Rock Properties

Take the raw elevation from tectonics and assign material properties (rock hardness, lithology) to each tile. These properties may derive from crust type (e.g., granite vs. sedimentary deposits) or tectonic age (new mountains vs. old cratons).

### 2. Volcanic Landform Generation

Sprinkle in volcanoes. Using tectonic context (e.g., plate boundaries for stratovolcano chains, interior hotspots for shield volcano islands), raise local terrain at those points. Differentiate volcano types by shape: stratovolcano peaks vs. broad shield domes.

### 3. Erosion Simulation

Iteratively apply erosion algorithms to the heightmap:

- **Thermal erosion:** Smooth any overly steep slopes by collapsing material from high to low until a stable angle-of-repose threshold is met. This simulates rockfalls and soil creep that naturally reduce sharp cliffs.

- **Hydraulic erosion:** Simulate rainfall and runoff. For each tile, let water flow downhill (based on the height differences to neighbors), removing a proportional amount of sediment from higher areas and depositing it in valleys. This models river carving, canyon formation, and the build-up of alluvial plains. Over iterations, this creates river networks, smooths peaks, and fills basins with sediment. Large-scale outcomes include branching river valleys, floodplains, and deltas at river mouths.

- **Glacial erosion:** In regions that are cold and high enough (to be determined later by climate), simulate glacier coverage grinding the land. This could be a simplified pass that widens and deepens pre-existing valleys and hollows out fjords in coastal mountain areas. Glacial erosion would tend to dramatically erode high peaks (sharpening them into horns and ridges) and scoop deep U-shaped valleys.

(Note: In practice, full hydraulic/glacial erosion simulation is complex and might be simplified or iterated only a few times for performance. We aim for a plausible end state rather than exact physical accuracy.)

### 4. Sedimentation & Deposition

As a byproduct of erosion, simulate deposition in lowlands. Elevation that is worn away from mountains should appear as sediment layers in basins. For instance, low coastal plains or the edges of continents might gain thickness (raising terrain slightly or at least tagging those areas as "sedimentary cover"). River deltas at coastlines form where rivers drop their sediment load upon hitting the ocean – this can be modeled by flattening and slightly expanding land at river mouths. The result is gentle, fertile delta terrain.

### 5. Finalize Heightmap & Water Flow Context

After erosion, we have a refined heightmap. We also identify depressions that lie below sea level or that have no outlet (inland basins). These will be important for the next Oceanography stage (to flood with water if below sea level, or to possibly form lakes if enclosed). We might run a flood-fill to mark all areas that would be underwater at various sea levels, to help set an initial sea level (though the actual sea level will be chosen globally in Oceanography).

**Inputs & Outputs:** The Geomorphology stage requires **input** data from Foundation: at minimum, the initial _elevation map_ (including both continents and ocean basin depths or an indication of what is oceanic crust), the _crust material map_ (rock types or hardness), and perhaps an initial _plate age map_ (to distinguish newer vs older surfaces). It may also take a preliminary _land/ocean mask_ (though final sea level is not set yet, having a reference sea level helps identify coastal plains). The **outputs** of geomorphology include a finalized **heightmap** (terrain elevation for every tile), which is the basis for all later stages. Additionally, we output a **slope/drainage map** indicating flow directions for water (useful for hydrology), and a **sediment thickness map** (where thick sediments vs. exposed bedrock are, affecting soil and fertility later). We may also tag features like **river channels** (paths of major rivers carved by erosion) and **volcanic peaks** (which could influence climate locally and resource placement). Essentially, the geomorphology stage "prepares the canvas" – a detailed terrain with plausible valleys, ridges, and basins.

**The Levers (Parameters):** Several global and regional parameters allow designers to drastically alter the generated terrain while still following geophysical logic:

- **Primary Levers:**
  - **Global Erosion Intensity (World Age):** This controls how "worn down" the world is. A high erosion setting yields old, smooth landscapes with lower mountains and extensive sediment in basins (like an ancient world with rolling hills), whereas a low erosion (young world) setting preserves jagged peaks and steep terrain. This essentially toggles the time span of geomorphic processes.
  - **Global Sea Level:** While actual sea level is set in the Oceanography stage, it's a critical top-level lever that dramatically changes terrain appearance. Higher sea level floods coastal lowlands and creates shallow seas over continental shelves, whereas lower sea level exposes more land (connecting islands, broadening continents). This lever has eustatic effect – a simple percentage of water coverage target (e.g., Earth's ~71% water cover) – and is often used to create worlds with many archipelagos (high sea level) versus supercontinents (low sea level).

- **Secondary Levers:**
  - **Rock Hardness Variability:** A parameter that increases or decreases the contrasts in rock resistance. High variability means some areas are extremely resistant (forming stark cliffs or plateaus) while adjacent softer rocks erode into low valleys. Low variability would make terrain more uniform in relief. This lever influences how rugged or smooth the terrain appears at a local scale.
  - **Volcanism Frequency:** Controls how many volcano-related features are generated. A higher setting produces more volcanic mountain chains and island arcs (or hotspots), which can create high peaks isolated from tectonic ranges (useful for flavor, e.g., a Hawaii-like chain in open ocean). A lower setting might mean only tectonic mountains dominate.
  - **Mountain Uplift Scale:** Although tectonics largely sets initial mountain height, a tweakable parameter could scale all tectonic elevations up or down to simulate a world with extremely high mountains vs. very modest ones. (This can be thought of as how vigorous plate collisions are in general.)
  - **Glaciation Extent (if using a snapshot):** If we include a glacial epoch snapshot, this lever could control how far glaciers extended (carving more terrain in mid-latitudes vs. just polar caps). This lever might be implemented indirectly via the Climate stage, but it affects geomorphology (creation of fjords, drumlins, glacial valleys).

**Abstraction Strategy:** We will approximate the complex geomorphic processes with efficient field operations on our hex grid, using a combination of cellular automata and graph-based algorithms:

- _Thermal erosion_ can be implemented as a local smoothing filter applied iteratively: if a height difference between adjacent tiles exceeds a threshold (steep cliff), we transfer a bit of height from the higher to the lower. This mimics rockfall until slopes are below the stability angle.

- _Hydraulic erosion_ can use a **flow accumulation** model. We simulate a notional unit of rainfall uniformly, have it flow downhill (along the steepest neighbor or split among neighbors by slope). We remove a small fraction of height from each cell proportional to the water flow and the cell's slope (emulating river cutting power) and deposit that sediment when flow slows down (e.g., at flat areas or when entering the ocean). Technically, this could be done by sorting cells by height and "raining" downward, or by iterative relaxation where each cell sends material to lower neighbors and receives from higher ones. We won't simulate actual water volume or time-varying flow – instead we aim for an equilibrium terrain where uplift and erosion balance in a plausible way.

- _Glacial erosion_ can be abstracted by identifying where permanent ice would exist (to be determined by climate). In those regions, we deepen valleys aggressively: for any cell with ice, lower its altitude a bit and also lower neighbors in the ice's flow direction to carve troughs. Additionally, flatten the bottoms of valleys and steepen sidewalls slightly to get the U-shape profile. We might also simply repurpose the hydraulic algorithm but with a much larger "tool" size (glaciers erode broader swaths than rivers).

- _Sediment deposition_ can be handled by accumulating removed material in a buffer and then adding it to cells designated as deposition zones (like low elevation outlets or basins). Another approach is to simulate a diffusion of terrain: material moves from high gradient areas and settles in low gradient areas.

- These operations (smoothing, flow-based carving, diffusive fill) are all **neighbor-based** and can run in a few iterative passes. By adjusting their strength and iteration count, we control the world's "age" appearance.

- We will carefully manage performance given the map size (~120×80 max). Most algorithms are linear in number of cells, which is fine. Hydraulic erosion can be the heaviest; if needed, we simplify by only simulating major rivers (e.g., limit how fine the network goes by setting a threshold of drainage area).

- Notably, we won't perfectly conserve mass of sediment, but we try to ensure overall volume is roughly preserved (or realistically reduced if some goes to sea). The goal is a visually convincing terrain, not a physically exact mass balance.

At the end of geomorphology, we have a consistent heightmap with realistic mountains, valleys, and plains, setting the stage for water and climate to interact with it.

| Geomorphology Inputs | Geomorphology Outputs | Key Levers | Downstream Usage |
|---|---|---|---|
| - Tectonic base elevation map<br>- Crust/rock type map<br>- Initial land/ocean division (approximate) | - Final detailed heightmap (terrain elevation)<br>- Slope & flow directions (drainage map)<br>- Sediment depth map (soil parent material)<br>- River and delta locations<br>- Volcano locations (tags) | - _Global Erosion Intensity_ (terrain age)<br>- _Global Sea Level_ (fraction of world flooded)<br>- _Rock Hardness Variance_<br>- _Volcanism Frequency_ | - **Climate:** uses elevation for temperature lapse rate & wind patterns; uses slopes for orographic rain shadows.<br>- **Hydrology:** uses flow map to route rivers & place lakes.<br>- **Soil/Ecology:** uses sediment vs. bedrock to determine soil depth and fertility; volcano tags for mineral-rich soils and geothermal features. |

## Oceanography (The Heat Engine)

**Real-World Domain:** Oceanography encompasses the planet's oceans and their role in distributing heat, moisture, and influencing climate. On Earth, oceans are a massive **heat engine** and regulator: they absorb solar heat near the equator, transport it via currents, and release it to the atmosphere, especially in higher latitudes. This involves two main circulation systems:

- **Wind-Driven Surface Circulation:** Prevailing winds (from the Climate system) push the top ~100 meters of ocean water, creating large rotating currents called **gyres** in each ocean basin. For example, the trade winds and westerlies produce subtropical gyres (like the North Atlantic Gyre) with strong boundary currents (e.g., the Gulf Stream). These currents move warm water poleward on the western sides of oceans and cooler water equatorward on the eastern sides. Continents deflect and guide these currents, and the Coriolis effect helps them form circular patterns.

- **Thermohaline Deep Circulation:** Below the surface, **thermohaline circulation** is driven by differences in water density, which depend on temperature and salinity. In polar regions, water gets very cold and forms sea ice, which leaves salt behind, making the remaining water extra dense so it sinks. This sinking cold water gradually flows at depth toward the equator, while warm surface water flows poleward to replace it – collectively forming the **global conveyor belt**. This process is slow but global in reach, connecting oceans in a planet-wide loop.

The interaction of these circulations results in specific phenomena: **warm currents** (like the Gulf Stream) that raise temperatures of downwind land (e.g., keeping Western Europe mild for its latitude), and **cold currents** (like the Humboldt Current) that cool and dry adjacent coasts (e.g., the Atacama Desert owes its aridity partly to cold offshore waters). Oceans also influence climate via **maritime vs. continental effects** – water's high heat capacity moderates temperature swings, so coastal areas have milder climates than interiors.

**Sea level** is another crucial factor: "sea level" itself can change globally (eustatic changes, e.g., during ice ages more water is locked in ice so global sea level falls) or locally (isostatic changes, land rising or sinking due to tectonics or ice mass). Sea level determines which land is submerged (creating continental shelves, shallow seas, archipelagos) and which is exposed.

**Ocean stratification and temperature:** Surface waters are warmest at low latitudes, while deep ocean is cold (~4°C). Upwelling zones (where deep water rises, like off Peru) bring nutrients and cool waters up. **Sea ice** forms in polar oceans seasonally (or year-round at high latitudes), increasing albedo and acting as an insulating lid that slows heat loss from ocean to atmosphere.

**Tides** and **coastal processes** (waves, etc.) exist, but in a global generator we often ignore tides except as small modifiers, since they mostly affect local coastal features rather than global climate.

In short, the oceans redistribute heat and water around the globe: they store solar energy, transport it via currents, influence where climates are temperate or extreme, and act as sources of moisture for rainfall (via evaporation). A realistic world generator should approximate these effects to get believable climates.

**Simulation Staging (Order & Steps):** The Oceanography stage sits between geomorphology and climatology. We perform it _after_ we know the shape of continents and major terrain (since ocean basins and coastlines are defined by the heightmap), but _before_ we compute atmospheric climate in detail. This ordering is because ocean temperatures and currents serve as boundary conditions for the climate model – the atmosphere responds to ocean surface temperatures (SSTs) and moisture from the sea. Also, the ocean has a longer thermal memory, so it's plausible to set up a steady ocean state first. The atmosphere, being faster, will adjust to it. (There is a mutual coupling in reality, but in our pipeline we break the loop by doing oceans first and then climate. We may later allow a second iteration if needed for fine-tuning, but one pass should suffice.)

Key steps within the Oceanography stage:

1. **Sea Level Determination:** Decide the global sea level based on the **Sea Level** parameter (percentage of planet's surface to flood). This means taking the heightmap and increasing the waterline until the desired fraction (say ~71%) of tiles are underwater (mimicking Earth). As we raise water, low-lying coastal regions become shallow seas (continental shelves). In our data, we mark tiles below sea level as ocean and compute water depth = –(elevation) for submerged tiles (with a cap at some shallow depth for shelf areas). We might also incorporate isostatic adjustment: e.g., if large ice sheets (to be determined in climate) press down land, locally higher sea level, but that detail can likely be skipped in a game context.

2. **Ocean Basins and Depth:** Classify underwater areas into **deep ocean basins** vs. **shelves**. Where the crust was marked as oceanic, depths should be deep (e.g., 4,000 m), except near coasts where we transition to continental crust (depth ~100–200 m on shelves). We can use a simple model: if a coastal tile is adjacent to land, limit its depth to shelf depth (this yields a rim of shallow water around continents, which matches the real flooded continental shelves). Further out, assign deeper depths. This is mostly for flavor (depth doesn't directly affect climate much, but could be relevant for placing fisheries or deep ocean resources).

3. **Surface Temperature Distribution (SST):** Compute approximate sea surface temperatures. Simplified, SST is primarily a function of latitude (equator ~ warm, poles ~ cold) and secondarily of currents. We can start with a latitude-based gradient: e.g., 28°C at equator tapering to –1.8°C (freezing) at poles, smoothly. Then adjust for currents:

   - Identify major current flows. Without simulating fluid dynamics in full, we can deduce some main flow patterns from the wind patterns (which we know theoretically even before running climate: e.g., easterly trade winds in tropics drive westward equatorial currents; mid-latitude westerlies drive eastward currents in temperate zones). We also use the positions of continents to guide gyre formation: water will circulate clockwise in northern hemispheric oceans, counterclockwise in southern (Coriolis effect).

   - With these patterns, produce an **SST anomaly field**: e.g., western ocean basins where warm currents flow poleward should be a bit warmer than latitude norm (e.g., Gulf Stream makes North Atlantic warmer for its latitude); eastern sides with cold upwelling currents should be cooler (e.g., California Current or Peru Current cooling west coasts). We don't have to explicitly simulate upwelling, but we know to cool the SST along west coasts of continents in subtropics (that yields deserts like the Atacama and Namib).

   - Also, small or enclosed seas might be treated as their own zone (e.g., a Mediterranean sea might get extra warm and saline due to isolation and high evaporation).

   - A rudimentary approach is to "paint" SST by zones: equatorial belt (warm), subtropical gyre centers (warm pools), eastern boundary currents (cool strips), polar seas (near freezing). We ensure continuity and no huge unrealistic gradients.

4. **Sea Ice Coverage:** Based on SST and latitude, determine where sea ice forms. Typically, any ocean tile with SST at or below ~-1 to -2°C will be ice-covered (permanent ice at the poles, seasonal ice extending outward in winter). Since we are not doing seasonal simulation explicitly, we can mark a rough year-round ice extent (e.g., poles out to ~70° latitude or less if warmer climate). Sea ice tiles will later influence climate by reflecting sunlight (high albedo) and by cutting off evaporation. We output a binary or fractional **sea ice map**.

5. **Surface Currents (Vector Field):** For completeness, we can output a coarse vector indicating prevailing surface current direction for each ocean tile (this could be used by other systems, e.g., for drift of floating things or just visualization). We derive this from the earlier reasoning: in each ocean basin, set a clockwise or counterclockwise loop. For instance, between 0°–30°N, water flows west (driven by trade winds); hitting a continent, it splits poleward; between 30°–60°N it flows east; then back equatorward on the eastern side. We do analogously in the south. This recreates the major gyres qualitatively. We also include an Antarctic circumpolar current if a continuous ocean exists around the pole (no land barrier at high southern latitudes). We won't simulate vertical circulation explicitly, but we implicitly captured some effects in the SST distribution.

6. **Salinity (Optional):** If needed, we could assign a simple salinity field (e.g., higher in mid-latitudes where evaporation > precipitation, lower near mouths of big rivers or high rainfall zones). This might not be necessary unless we want to simulate density, but could affect where sea ice forms (higher salinity water needs lower temp to freeze). Likely can be ignored in this high-level model.

At the end of these steps, we have the ocean's state: which areas are ocean vs land (and their depths), the temperature of the ocean surface everywhere, where ice is present, and a notion of water movement patterns.

**Inputs & Outputs:** Inputs needed are the _final heightmap_ from geomorphology (to know what's below sea level after we set the level) and possibly the _crust type map_ (to differentiate oceanic vs continental for depth handling). We also use some _baseline planetary parameters_ like latitude/solar input distribution (which might come from a global config – e.g., axial tilt or a predefined solar constant). For wind guidance, we rely on known Earth-like rotation patterns rather than an input (since we haven't run the atmosphere yet, we assume a generic tri-cell pattern to inform currents).

The **outputs** of Oceanography include:

- **Ocean Mask & Bathymetry:** A map marking which tiles are ocean and the depth of water there. Land tiles might also get a "coastal depth" attribute (0 for land above sea level).
- **Sea Surface Temperature (SST) Map:** A field of surface ocean temperature for each ocean tile (and perhaps a notional "sea level pressure" or "ocean heat content" but SST suffices for climate).
- **Sea Ice Map:** Tiles flagged with permanent/seasonal ice cover.
- **Ocean Currents Field:** A vector or direction per ocean tile indicating prevailing surface current flow (could be as simple as an index like "western boundary current" or arrow directions).

These outputs will feed into the Climate stage: SST influences air temperature and humidity, sea ice affects albedo and moisture availability, and the presence of ocean vs land is crucial for wind and precipitation patterns. Additionally, the sea depth map can be useful for gameplay (e.g., shallow versus deep ocean for naval mechanics) though not directly needed for climate.

**The Levers (Parameters):**

- **Primary Levers:**
  - **Global Sea Level:** (Mentioned before) This is arguably an Oceanography lever as well as geomorphology. It determines the coastline shapes and the extent of shallow seas. Raising or lowering it dramatically changes how much continental area is exposed. It also can simulate different planet types: e.g., a low-sea-level world with vast dry continental interiors vs. a flooded "water world" with scattered islands.
  - **Ocean Heat Transport Efficiency:** This controls how much the ocean moderates climate. A higher setting means stronger currents and more mixing, so heat is more evenly distributed (smaller temperature gradients between equator and poles). A lower setting would localize heat (hotter tropics, colder poles) – perhaps akin to a planet with more sluggish circulation or more land blocking currents. This lever might be implemented by adjusting the SST gradient slope: e.g., with high transport, polar waters are a bit warmer than normal and equatorial a bit cooler (flattening the gradient).

- **Secondary Levers:**
  - **Axial Tilt (Obliquity):** Although mainly a climate lever, it influences oceans indirectly by affecting polar ice extent seasonally and thus currents. A higher tilt yields more seasonal ice melt cycles. We might include it here as well just to note that if axial tilt is extreme, polar oceans might get seasonally ice-free and that could be handled in how we mark "permanent" ice (with high tilt, perhaps less permanent ice).
  - **Salinity Concentration:** If we choose to expose it, a lever that sets average ocean salinity (or effective density). Higher salinity could lead to stronger thermohaline sinking (because water gets denser more easily when cooling) – effectively a subtle control on deep circulation strength. This is probably too fine for gameplay, so likely omitted or assumed Earth-like.
  - **Sea Ice Extent Bias:** A parameter to increase or decrease the default sea ice coverage (simulating, say, a slightly colder world with more ice vs. a warmer one with open polar seas). This could be toggled if we want an ice age scenario.
  - **Oceanic Storminess (Wave height / Coastal erosion):** Possibly irrelevant for map generation, but could influence how we shape coastlines (e.g., high storminess might smooth out small islands or cause wider beaches). Probably not a separate lever in our model unless needed for flavor.

**Abstraction Strategy:** Instead of dynamically simulating fluid dynamics, we use a rule-based and empirical approach:

- We derive SST from latitude and adjust by a few pattern templates representing currents. For instance, identify the largest gaps between continents along the equator; assume those have westward equatorial currents and warm pools on the western side of ocean basins. This can be done by scanning from east to west across the map for continuous water and warming the last few water tiles before hitting land (simulating west Pacific warm pool or Gulf Stream warmth hitting Europe). Conversely, for every major west coast of a continent in subtropics, apply a cooling offset for a cold current (California/Canaries type). These adjustments can be simple lookups based on latitude bands and whether a tile is on a west or east side of an ocean.

- One could generate a simplified **graph of ocean basins**: nodes as centers of basins, edges as pathways around gyres. Then assign a temperature anomaly to each node and interpolate to tiles. But given the coarse scale, even simpler: we know Earth's pattern; for our world, mimic that qualitatively.

- Sea ice can be determined by thresholding the SST map against freezing point. Maybe we add a margin for seasonal ice (e.g., mark one or two tiles beyond the immediate freeze line as "seasonal ice zone" if needed for biome decisions).

- Currents are abstract: we likely won't explicitly store a full vector field beyond some arrows for visualization. But if needed, we could store a per-tile flow direction (eight possible directions in hex grid perhaps). We can derive it from wind belts: e.g., all equatorial waters get an arrow west; all subpolar get east, etc., adjusting where land interrupts.

- **Why not simulate?** The complexity of solving Navier-Stokes or even shallow-water equations for ocean on our grid is high and not worth it for one-off world gen. Instead, by leveraging known geophysical principles (gyres, thermohaline sinking at poles, upwelling on west coasts), we can approximate the end state fields with static computations.

- We will ensure that any major climate-impacting features of oceans are captured: e.g., if a large ocean spans from equator to pole unobstructed, we might mimic a conveyor belt (like a proxy "Gulf Stream" carrying warmth north). If continents form a closed basin at tropics (like a Mediterranean), we might simulate it being extra warm and high salinity (if we cared to detail).

- **Eustatic vs Isostatic note:** Eustatic (global sea level) we handle via the lever. Isostatic (land bouncing) we probably won't simulate explicitly, but if tectonics provided an "isostatic adjustment" layer (like depressed crust under ice sheets), we could incorporate that by effectively lowering or raising local terrain prior to flooding.

- The ocean stage doesn't involve iterations over time except conceptually in setting equilibrium. We treat it as a steady state solver: assign fields based on inputs and some logical constraints, done.

The output from the Oceanography stage provides the necessary context for Climate: essentially where is water vs land, how warm the oceans are, and how much moisture and heat they can supply to the air, as well as initial clues for wind (though we'll recalc winds in climate, the ocean will be considered passive then). It also enriches the world for any gameplay related to oceans (like distinguishing shallow seas for fishing or deep ocean for navigation).

| Oceanography Inputs | Oceanography Outputs | Key Levers | Downstream Usage |
|---|---|---|---|
| - Heightmap (from geomorphology) for coastlines<br>- Crust type map (oceanic vs continental)<br>- Latitude/solar input (planet tilt, for baseline heating) | - Land/Ocean mask (final coastline after sea level)<br>- Bathymetry (water depth map)<br>- Sea Surface Temperature (grid of SST values)<br>- Sea ice coverage map (polar ice extent)<br>- Ocean current directions (prevailing surface flow per region) | - _Global Sea Level_ (flooded % of world)<br>- _Ocean Heat Transport_ (currents strength smoothing temp gradients)<br>- _Polar Ice Extent_ (cooling or warming oceans)<br>- _Axial Tilt_ (affects seasonal ice, indirectly climate) | - **Climate:** uses SST to set coastal and global air temperatures, moisture source for humidity & precipitation; uses sea ice to increase albedo & block evaporation, uses ocean mask to determine land/sea for wind patterns (monsoons, etc.).<br>- **Hydrology:** ocean mask defines where rivers end (river mouths/deltas into ocean).<br>- **Ecology:** marine biomes (not our focus, but e.g., presence of cold vs warm currents could influence coastal fish or reef presence if ever modeled). |

## Climatology (The Atmosphere)

**Real-World Domain:** Climatology deals with the large-scale patterns of atmospheric circulation – how heat and moisture move through the air to create climates. Earth's climate system is driven by solar energy distribution and the planet's rotation/tilt, and modulated by geography (land/ocean layout, mountains, etc.). Key real-world concepts include:

- **Global Circulation Cells:** The unequal heating of Earth (equator gets more sun than poles) sets up convective loops. Warm air rises at the equator, flows aloft toward higher latitudes, cools and sinks around ~30° latitude; this is the **Hadley cell** circulation. Similarly, a **Polar cell** operates with air rising ~60° and sinking at the poles. In between, the **Ferrel cell** is a secondary circulation (driven by interaction of the other two) with air rising around 60° and sinking at 30° (opposite direction to Hadley). These three-cell patterns per hemisphere explain prevailing surface winds: near the equator, air flows _toward_ the equator as it replaces rising air (and is deflected west by Coriolis), forming the **trade winds** (e.g. NE trades in Northern Hemisphere). In mid-latitudes (30–60°), surface winds flow toward the poles (from the 30° high-pressure zone toward the 60° low-pressure zone) and deflect east, giving the **westerlies** (west-to-east winds) that dominate temperate zones. Near poles, surface winds (polar easterlies) flow outward from the polar highs toward 60°.

- **Intertropical Convergence & Doldrums:** At the equator, the converging trade winds cause air to rise continuously, creating a band of clouds and heavy rainfall (the tropical rain belts) – this is the ITCZ (Intertropical Convergence Zone). The rising humid air gives equatorial regions their rainforests. Meanwhile, the sinking air at ~30° in the subtropics is dry (having lost moisture) and creates belts of high pressure with clear skies – that's where most of the world's deserts lie (e.g., Sahara, Australian Outback).

- **Prevailing Winds and Climate Zones:** These global wind patterns lead to distinct climate zones: wet tropics, dry subtropics, mid-latitude stormy zones (where cold and warm air masses meet around 45–60°, generating extratropical cyclones). At the surface, those patterns also produce features like the **horse latitudes** (around 30° where winds are often calm under the high-pressure zones) and the **doldrums** at the equator (calm but rainy low-pressure zone).

- **Coriolis Effect:** Because Earth rotates, moving air (and water) is deflected – to the right in the Northern Hemisphere and to the left in the Southern Hemisphere. This shapes wind directions (e.g., why trade winds come from the NE/SE rather than due north/south) and causes rotating systems (hurricanes spin counterclockwise in the north, clockwise in the south). Our simulation should incorporate Coriolis by using the standard pattern of wind directions in each cell.

- **Orographic Lifting and Rain Shadows:** Terrain has a powerful local effect. When moist air flows toward mountains, it is forced to rise. Rising air expands and cools (adiabatically ~6.5°C per km), causing moisture to condense and fall as precipitation on the windward slopes. By the time the air passes over the summit and descends leeward, it has lost much of its moisture. The descending air warms and dries, creating a **rain shadow** — a dry region on the lee side of the mountain. This explains, for instance, why coastal mountains have lush forests on the seaward side and arid deserts or plains immediately inland.

- **Monsoons (Seasonal Wind Reversal):** Land and sea heat differently with seasons. In summer, land heats up more, creating rising air (low pressure) over continents, which draws moist air in from oceans – yielding **monsoon rains**. In winter, land cools, high pressure forms, and winds reverse seaward, giving dry conditions. The Indian summer monsoon is a prime example: moist ocean winds flood the land with rain for months. Monsoons are essentially giant seasonal sea-breezes, critical for regions like South Asia, West Africa, etc. Our climate model should allow for monsoon-like behavior if large landmasses are present in the subtropics/tropics – i.e., a pronounced wet season and dry season due to wind reversal.

- **Adiabatic Lapse Rates & Elevation Climate:** Higher elevations are colder (roughly 6°C drop per 1000m for the moist adiabatic lapse rate). So mountains and plateaus will be cooler than lowlands at the same latitude. This means you get alpine climates (tundra or glaciers on high peaks even in tropics, e.g., Kilimanjaro's snow cap).

- **Albedo and Energy Balance:** Different surfaces affect climate by reflecting or absorbing sunlight. Snow/ice has high **albedo**, reflecting most sunlight, which keeps those areas cold (and is a self-reinforcing feedback: colder -> more snow -> higher albedo -> even colder). Dark oceans or forests have low albedo, absorbing heat. Vegetation can thus affect local climate slightly, but in our pipeline we mostly treat albedo as a function of snow/ice coverage and perhaps desert vs vegetated (deserts reflect a bit more than forests). The **ice-albedo feedback** is significant in polar climate stability: we should ensure our model can mimic that (e.g., tiles with permanent snow/ice we might enforce to stay very cold).

- **Humidity and Precipitation Patterns:** Warm air holds more moisture; as air cools (rising or moving to higher latitude), it saturates and rains out. Thus, rising air (ITCZ, orographic uplift) causes rain, sinking air causes dry regions. Coastal areas downwind of oceans tend to be wetter (maritime air), while inland areas far from moisture can become very dry (**continentality** effect). Also, cold air (e.g., polar regions) even if not sinking is dry simply because it can't hold much moisture (hence polar deserts).

- **Seasonality:** With Earth's axial tilt (~23.5°), solar heating migrates north-south over the year. This causes seasons – e.g., the ITCZ moves north in northern summer, bringing rains just north of equator, then shifts south in southern summer. Monsoon regions depend on this shift. Our simulation might not explicitly time-step through seasons, but we can incorporate their net effect (e.g., an area might get marked as "seasonally wet" vs "year-round wet" depending on latitude and land/ocean layout). If we include axial tilt as a lever, more tilt exaggerates seasonality (harsher summers and winters, and possibly bigger monsoon swings), whereas zero tilt would produce more uniform climates year-round.

**Simulation Staging (Order & Steps):** The Climatology stage uses outputs from geomorphology and oceanography to calculate atmospheric conditions. It comes after Oceanography because we need SSTs and the land/ocean mask ready. We assume the climate reaches a quasi-steady state (we're not simulating daily weather, but long-term averages like monthly or annual means). The stage can be conceptualized in these steps:

### 1. Insolation & Base Temperature

Compute a baseline temperature for each location based on latitude and elevation. We use the axial tilt to inform how wide the tropical zone is and how cold the poles are. A simple model: $T_{\text{ideal}}(lat) = T_{eq} \cos^{1/4}(lat)$ or some function that decreases from equator to pole, then adjust it for axial tilt which effectively spreads heat more towards poles if tilt is high (because summer at high lat can be quite warm). Also drop temperature by lapse rate for height: e.g., subtract ~6.5°C per 1000m of elevation. The result is a first-guess temperature map ignoring circulation.

### 2. Pressure Belts & Wind Generation

Establish where the semi-permanent pressure zones are: equatorial low, subtropical highs (around 30°), subpolar lows (around 60°), polar highs. Using these, generate surface wind directions for each tile:

- Equator to ~30°: winds flow from subtropical highs towards equator (toward low pressure), deflected west => Trade winds (blowing from east to west).
- ~30°–60°: winds flow from subtropical high toward subpolar low, deflected east => Westerlies (blowing west to east).
- ~60°–90°: winds from polar high toward subpolar low, deflected west => Polar easterlies.

We need to account for the distribution of land and sea: Over oceans these belts hold, over land they can be disrupted by differential heating (monsoons). So next we adjust winds for continents:

### 3. Continental vs Oceanic Differential (Monsoon & Land Breeze Effects)

Identify large land masses in the tropics/subtropics. During the "summer" of that hemisphere, those land areas will heat more than ocean, creating a seasonal low pressure that will draw winds from ocean to land (monsoon). We can encode a simple rule: if a region is a big land and it's in, say, the subtropics, mark it as having wet summer winds coming from the nearest ocean. For instance, a continent straddling the equator to 30°N would in northern summer attract southerly winds from the ocean (reversing the normal trade wind). In our static climate, we might reflect this by giving that region an ample precipitation season. Practically, we can modify the wind direction map: for tiles in interior of a continent, set wind direction in summer to blow inland from the ocean (find nearest ocean direction). We might store two wind direction sets (summer and winter) or just store a notion of "monsoonal flow" for use in precipitation.

Also smaller scale: daily land/sea breezes (coastal day-night wind shifts) probably too fine to model, but monsoon is like a seasonal mega-scale sea breeze.

### 4. Moisture Transport & Precipitation

Using the wind and SST information, simulate how moisture moves and where it falls as rain or snow:

- Assign each tile a source of moisture: Ocean tiles evaporate water into the air above; warm SST means more moisture in air. So coastal downwind areas get moisture easily. Land areas far downwind might see moisture depleted by upstream rain.

- We can do a simplistic water cycle: For each tile (perhaps scan in order of wind flow), carry an amount of moisture (starting higher over ocean, especially warm ocean). As air moves to next tile (according to wind vector), check if it rises (going up a mountain or to cooler latitudes) – if so, condense some moisture as precipitation. We drop moisture if:
  - The tile is ascending terrain relative to the upwind neighbor (mountain causing orographic rain).
  - The tile is at a latitude where air normally rises (e.g., equator or 60°) – simulate persistent low pressure rainy zones there.
  - The air has traveled over ocean and hits land – often the first coastal mountain or uplift will cause rain (e.g., coastal ranges).

- We also include convection in tropics – basically assume the ITCZ belt gets heavy rainfall uniformly.

- Each time we precipitate, reduce the moisture in the air mass. So by the time air reaches interior of a continent, it may be dry (creating deserts). This will naturally produce rain shadows: as soon as air crosses a mountain and descends, it's dry, so the next regions get little rain.

- Ensure subtropical highs (~30° lat, especially on west sides of continents) get minimal rain – those are desert areas (Sahara, etc., form from sinking dry air and often cold offshore currents stabilizing the air).

- High latitudes (~90°) also low precipitation (cold air holds little moisture).

- The result is a precipitation map. We may want separate maps for annual total and maybe a seasonality indicator (like monsoon regions have strongly peaked wet season vs. deserts have almost none, etc.). At least, we'll know where are deserts (<X mm rain), where are rainforests (>Y mm), etc.

### 5. Refine Temperature with Feedbacks

Now adjust the temperature map with the effects of our winds and precipitation:

- Regions that got heavy cloud cover and rain (tropics) might be a bit cooler than bare-sun deserts at the same latitude (e.g., cloud cover reflects some sun). But also moisture leads to greenhouse warming at night – these details might cancel out, can ignore or treat as small.

- Deserts with clear skies could have hotter days and colder nights; our model might just reflect in a higher average diurnal range, but we likely won't simulate diurnal cycle. Instead, perhaps we bump desert daytime temps up slightly.

- Most importantly: Snow/Ice feedback. Wherever our precipitation map and temperature indicate permanent snow cover (e.g., high mountains or polar land) or where oceanography gave us sea ice, we should enforce that those tiles stay cold (below 0°C) year-round. The reflective snow and high elevation already gave that, but just ensure consistency. If a tile ended up with a lot of snow cover fraction (e.g., tundra), maybe reduce its temperature a bit more (to not melt all the snow).

- Possibly recalc the biome of each tile iteratively: we could loop once more to ensure, for instance, that a tile designated as "glacier" (due to climate cold and precipitation) has temp < 0, etc.

### 6. Add latitudinal seasonal swing

We might output not just mean annual temp, but maybe a rough seasonal range (for gameplay or biome use). For example, a continental interior might have hot summers and cold winters – we could indicate that by providing a high and low temperature value. This can be derived from latitude and perhaps distance from ocean (continental climates have bigger range). Axial tilt lever plays heavily here: high tilt means greater difference between summer and winter temps especially at mid to high latitudes.

### 7. Climate Zone Classification (if needed)

Using temp and precip results, classify each tile into a Köppen-like climate category or directly into a biome (the next stage will refine into actual biomes, but we can pre-tag climates like "tropical wet", "semi-arid", "Mediterranean", "tundra", etc.). This is a summary for designers and also can guide biome assignment.

### 8. Wind Updraft & Storminess (optional)

We could calculate a map of relative storminess or wind strength (e.g., areas around 50° latitude are stormy due to frontal cyclones, tropics get hurricanes near warm oceans, etc.). This might not be needed unless we have gameplay that cares about storms or we want to place features like tornado alley or something. Possibly skip.

**Inputs & Outputs:** Inputs from previous stages we need the _elevation map_ (for orographic effects and lapse rate), the _land/ocean mask_ (plus SST from Oceanography for marine influence), and _sea ice info_ (which is effectively part of ocean data). We also consider the planet's _axial tilt_ and perhaps rotation speed if any (assuming Earth-like 24h, which we do). Possibly a _base solar constant_ if we allow varying star intensity (likely fixed since Earth-like). No explicit input of wind is needed because we generate it; however, we might use the _ocean current map_ to slightly influence climate (for example, if a warm current flows by a coast, we might make that coast warmer or wetter than it otherwise would be).

**Outputs:** The Climatology stage produces several critical data fields:

- **Temperature Map:** The average near-surface temperature for each tile (likely annual mean). We might also output a measure of seasonal temperature range or separate summer/winter means if needed for biome diversity.
- **Precipitation Map:** The total annual precipitation for each tile (or maybe a couple of values like wet season vs dry season rainfall if monsoons are strong).
- **Prevailing Wind Map:** For completeness, a vector or directional field of prevailing surface wind for each tile (or each region). This could be useful for things like spreading wildfires or pollution in game mechanics, but also just to visualize climate. We definitely use it internally for moisture transport, so we can output it.
- **Climate Zone Tags:** We can output a categorical map marking zones (e.g., "tropical rainforest," "savanna," "desert," "marine west coast," "continental," "tundra," etc.), though final biomes will refine using soil and hydrology. This climate classification is mostly intermediate, but it's a nice sanity check for realism.
- **Snow Cover Map:** Perhaps a fraction of the year a tile is snow-covered. From our data, any tile with mean temp below freezing will have permanent snow/ice (glacier or polar desert). Tiles that are cold in winter but melt in summer (like a place with seasonal snow) might not need explicit marking unless we want to know winter snowpack. Could output an approximate "winter snow" boolean if latitude + precip suggests it (for instance, a tile with winter avg below 0°C and some precipitation likely gets snow in winter).
- **Humidity Map:** Could be derived from precip and temp (e.g., we could output relative humidity or aridity index). Possibly not needed since precip suffices to deduce arid vs humid.

These outputs directly feed the next stages: **Hydrology** will use precipitation as the water input to drive rivers; **Soil/Pedology** will use climate (temp and moisture) to determine soil types and where permafrost is; **Ecology** will heavily use temp and precip to allocate biomes and vegetation.

**The Levers (Parameters):**

- **Primary Levers:**
  - **Axial Tilt:** This is a fundamental setting that affects climate patterns. Earth's 23.5° tilt gives us our familiar seasons. If we increase tilt (say to 40°), expect more extreme seasons: hotter summers, colder winters, and the climate zones (like monsoons and storm tracks) possibly extend further poleward in summer and retreat in winter. More tilt could intensify monsoons (land gets even hotter in summer relative to ocean) and possibly reduce permanent polar ice (since summers at high lat get more sun). Conversely, zero tilt means no seasons – climate zones would be static year-round (likely more stable tropics and larger polar caps since poles never get sun directly overhead). We need to allow this lever so the user can create, for example, an Ice Age world (small tilt, big ice) or a highly seasonal world. Our model will incorporate tilt by modifying how we distribute insolation with latitude and how we treat seasonal effects like monsoons and snow cover.
  - **Global Temperature (Greenhouse Level):** This lever controls the overall thermal energy in the atmosphere, analogous to CO₂ levels or star brightness. Higher global temperature means everything shifts warmer: ice lines retreat, biomes shift poleward, more evaporation and precipitation overall (a warmer world tends to be wetter because of more evaporation). A colder setting expands polar and high-altitude cold zones, potentially creating more glaciers and arid cold deserts. This can be a single scalar that we add or subtract from the temperature map after all calculations (and adjust moisture accordingly, since warmer air holds more moisture – so a +5°C world might have, say, +10% precipitation globally, for example).

- **Secondary Levers:**
  - **Hadley Cell Extent:** This parameter could alter how far the tropical circulation reaches. On Earth, the Hadley cells end around 30° latitude. If we allow a broader Hadley cell (perhaps if rotation were slower or the atmosphere thicker), the tropical rainy zone could expand and the subtropical dry zone move poleward. We can parameterize this by effectively shifting the latitude at which we transition from rising air to sinking air. This is a niche lever but could be interesting to simulate a slightly different distribution of deserts and rainforests.
  - **Precipitation Scalar / Aridity:** This lever simply scales how much rain falls overall. It could be tied to the "Global Temperature" because warmer means more evaporation = more rain, but we might let the user tweak it. For instance, an "arid world" slider might reduce all precipitation values by 30%, turning borderline grassland into desert, etc. Conversely, a "lush world" setting increases rainfall. It's a way to control the prevalence of deserts vs forests independent of temperature.
  - **Orographic Rain Multiplier:** If we want control over how strongly mountains wring out moisture, this lever can tune the rain shadow effect. A high setting means very pronounced rain shadows (mountains create stark wet/dry divides), while a low setting would mean some moisture gets over mountains (less extreme contrast). This could reflect differences in atmospheric moisture content or wind patterns. For game variety, one might exaggerate rain shadows to create dramatic desert vs jungle juxtapositions, or soften them to ensure the leeward side still gets some rain.
  - **Storminess / Variability:** A lever for how dynamic the climate is – e.g., frequency of storms. Hard to implement directly in a static model, but one could imagine it influencing how we smear out rainfall. A very high variability might mean some areas get torrential rains but then long dry spells (higher risk of drought/flood cycles), whereas low variability might distribute rain more evenly over time. We likely won't implement this deeply, but it could tie into biome flavor (for instance, a high-variability tropical climate might lean toward savanna (wet and dry seasons) while a low-variability one could lean rainforest (rain evenly all year)).
  - **Polar Moisture**: Possibly allow toggling if polar regions get any precipitation (Earth's poles are deserts with low precipitation). If someone wanted a snowy planet where even poles have frequent snow, one could up this. But it's probably under the global precipitation scalar.

**Abstraction Strategy:** Modeling climate on a hex map is a challenge, but we can achieve a believable result through a mix of heuristics and simplified physics:

- We essentially implement a **cellular automaton / advection** for moisture: for each cell, we have wind direction (we'll quantize directions on the hex grid) and we move a notional air parcel along that direction, raining out moisture when conditions say so. This is akin to the classic "flowline" precipitation models sometimes used in procedural generation. We might iterate this flow multiple times (or in a grid sweep) until stable.

- We use known patterns to initialize winds rather than calculating pressure via Navier-Stokes. Because the patterns (Hadley, etc.) are well-known for an Earthlike rotating planet, we can essentially hard-code the surface wind belts as a function of latitude and land/sea. For monsoons, a simple check like "if a tile is land and to its south (in NH summer) there is ocean, then likely summer winds come from south (onshore)" can be used. We might simulate two seasons (like two passes of moisture, one for summer wind, one for winter wind) and combine for annual rain.

- The precipitation deposition can be done by comparing each cell's humidity and capacity. We might assign each cell a "holding capacity" for moisture based on temperature (warm air holds more). Then as we move along wind, if the air's moisture exceeds capacity (because it cooled due to higher elevation or higher latitude), we dump the excess as rain. For orographic lifting specifically, when a windward cell is higher than its upwind neighbor, force a certain % of moisture to fall there. We reduce moisture as we go leeward.

- To ensure we capture major desert locations: We know they form under specific circumstances: subtropical highs (~30°) especially on west sides of continents (cold ocean + sinking air) – our model inherently does sinking at 30° and we cooled SST on west coasts, so that should come out dry. Interiors of continents (far from ocean) will run out of moisture by the time air gets there – our moisture transport will handle that. Rain shadows we explicitly handle via elevation check.

- We will calibrate with Earth as a mental reference: Does our model produce a band of rainforest near equator, deserts at 30°, mid-latitude moderate rainfall, etc.? We can tweak parameters until a map of precipitation vs latitude roughly matches Earth's known distribution (e.g., double ITCZ if needed near equator if our map wraps fully around).

- Temperature calculation is straightforward formula-based, plus adjustments. We ensure no tile ends up with something nonsensical like >60°C or <-80°C unless perhaps extreme greenhouse or tilt conditions are set.

- We do not explicitly simulate upper-atmosphere or ocean feedback beyond what's baked in (we already gave ocean influence by adjusting SST and monsoon effect). The climate is essentially a 2D horizontal model with some vertical logic (uplift and cooling).

- Time is not explicitly simulated (we're doing a steady climate), but conceptually we incorporate seasonal effects by splitting the process as mentioned (monsoon simulation with summer vs winter wind).

- If needed, we could add an iterative refinement: after initial precipitation calc, perhaps adjust winds slightly (e.g., a very hot desert might induce a small thermal low drawing some coastal winds). But likely unnecessary at this scale.

- **Cryosphere integration:** We treat ice/snow as part of climate: once we have temperatures, we determine ice cover (which we did in Oceanography for sea ice and can do for land glaciers here). If large ice sheets form on land (e.g., our model might put an ice cap on a polar continent), that could arguably feed back to depress the land (isostatic) or to send cold katabatic winds outward. Those effects are second-order; we may not simulate isostatic depression (that would feed back to geomorphology). But we do simulate that such an area has high albedo and remains cold. The net effect of ice on global climate (positive feedback) we basically account for by not letting those areas warm up easily.

- We also ensure any tile with ice (land or sea) gets minimal precipitation (polar regions are dry) – which our model naturally does since cold air holds little moisture.

- The result should be a plausible climate. We won't capture every nuance (like El Niño oscillations, or local fog zones, etc.), but we should see realistic broad patterns: e.g., a big continent around 20°N likely gets a monsoon on its ocean-facing side and desert in its interior; a long mountain chain will have green windward slopes and brown leeward slopes; an isolated oceanic island at the equator will be rainy all around, etc.

| Climatology Inputs | Climatology Outputs | Key Levers | Downstream Usage |
|---|---|---|---|
| - Elevation map (topography)<br>- Land/ocean mask and SST (from ocean stage)<br>- Sea ice map (from ocean stage)<br>- Planet axial tilt (degrees)<br>- Base solar constant / global temp setting | - Temperature map (avg near-surface temp per tile)<br>- Precipitation map (annual rainfall per tile)<br>- Prevailing wind directions (surface winds)<br>- Climate zone classification (tropical, arid, temperate, etc.)<br>- Snow/ice cover extent on land (glaciers, permafrost regions) | - _Axial Tilt_ (seasonality strength)<br>- _Global Temperature_ (greenhouse level)<br>- _Precipitation Scalar_ (overall humidity)<br>- _Orographic Rain Factor_ (rain shadow strength) | - **Hydrology:** uses precipitation and evapotranspiration (temp) to drive river flow; places lakes in high-rainfall or poor-drainage areas; influences groundwater.<br>- **Soil/Pedology:** climate (temp & moisture) determines soil formation rates and types (e.g. tropic vs arid soil) ; permafrost presence, organic content.<br>- **Ecology:** temperature and precipitation are primary drivers of biome distribution (desert vs forest vs grassland, etc.) ; also seasonality from tilt influences deciduous vs evergreen, growing seasons length.<br>- **Resources:** climate hints for coal (e.g., ancient tropical swamp regions), for example; also influences where certain crops could grow in gameplay. |

## Hydrology (Surface Water)

**Real-World Domain:** Hydrology is the study of how water moves across the land surface – through rivers, lakes, groundwater, and eventually to the ocean. On Earth, rainfall (from climate) collects in **drainage basins**: each basin is an area where all water drains to a common outlet (like a river delta). Rivers follow the terrain downhill, carving valleys and transporting sediment. Key hydrological concepts:

- **Drainage Networks:** Water organizes into hierarchical networks of streams (tributaries) joining to form larger rivers. The structure often looks like tree branches. The pattern (dendritic, radial, etc.) depends on topography and geology. In flat or uniformly erodible terrain, dendritic (tree-like) patterns form; in regions with ridges or faults, rivers may follow lines of weakness.

- **Endorheic vs Exorheic Basins:** Most drainage basins are _exorheic_, meaning rivers eventually reach the ocean (open drainage). Some are _endorheic_ (closed) – water collects in an inland basin with no outlet to the sea, often forming salt lakes or evaporating in place. Examples: the Caspian Sea, the Great Basin in the US. Endorheic basins usually occur in arid regions or where tectonic depressions are completely enclosed by high terrain. Recognizing these is important for placing lakes and marshes.

- **River Behaviour:** As rivers flow, they erode upstream areas and deposit sediment downstream. Steeper gradients lead to faster flow and more erosion (mountain torrents cutting V-shaped valleys). In flatter areas, rivers slow down, meander, and drop sediment, creating broad floodplains. At the river's mouth, if flow enters a standing body (ocean or lake), **deltas** can form from sediment deposition. If ocean currents or tides are strong, a delta may be swept away and an estuary forms instead.

- **Lakes:** Lakes form in depressions. They can be **exorheic** (with an outlet river) or **endorheic** (no outlet, water leaves only by evaporation). Lakes occur where drainage is obstructed (e.g., by a natural dam like a landslide or glacial moraine) or where basins are below the outlet. Large lakes often are temporary on geological scales (they fill with sediment or cut new outlets eventually). In arid climates, endorheic lakes tend to be saline (minerals concentrate as water evaporates).

- **Wetlands and Groundwater:** Not all water runs off immediately. Some percolates into soil (becoming groundwater). If groundwater meets the surface or saturates soil, wetlands (swamps, marshes) form. These are common in flat, poorly drained areas, or near river floodplains. Groundwater can emerge as springs, feeding streams even when no rain (baseflow). Our simulation may not detail aquifers, but conceptually, regions with high water table could be noted (useful for oasis or fertile area placement).

- **River Impact on Terrain and Biomes:** Rivers continuously shape the land (geomorphology already carved river valleys). Hydrology at this stage is more about _where water is present on the surface_: delineating river courses, placing lakes, and perhaps determining flow volume. These water bodies strongly influence biomes (e.g., river valleys may support forests in otherwise dry regions; the Nile is a green ribbon in the desert).

**Simulation Staging (Order & Steps):** Hydrology uses outputs from climate (precipitation) and geomorphology (terrain slopes). It naturally follows after climatology because we need to know how much water is input (rainfall) in each area, and after geomorphology because we need the terrain shape to know where water flows. In the pipeline, Hydrology can be a distinct stage (though initially we might implement a basic placeholder). If the design choice is to treat it lightly for now, we still outline how it _would_ work so the system can be expanded if needed.

Main steps in the Hydrology stage:

1. **Drainage Basin Delineation:** Analyze the heightmap to determine for each tile where its water will eventually go. Using the flow direction map from geomorphology (or recompute by looking at lowest neighbor of each tile), perform a graph traversal or union-find: every tile flows to one of possibly several outcomes – ideally an ocean tile (exorheic), or an inland sink (endorheic). Mark the basin for each tile (i.e., assign a basin ID for connected areas that share the same outlet). This step essentially partitions the map into catchments.

2. **River Network Extraction:** For each tile, compute a **flow accumulation** value – how much area/effective rainfall drains through it. A common method: each tile contributes a quantity proportional to its area * precipitation; you sum all contributions that funnel through downstream cells. We have precipitation per tile from climate, which we can multiply by tile area (though tiles are roughly equal area in our grid, so precip alone can serve as a weight). Starting from sources (tiles with no inflow), accumulate flow along the flow direction paths. The result is that lowland convergence areas get large flow values.

3. **Define River Paths:** Decide a threshold of flow above which we consider a watercourse a "river." For example, once a certain accumulation (drainage area) is exceeded, mark that path as a river. This will naturally mark larger streams and not every minor gully. We'll get a tree network within each basin from sources (where accumulation first exceeds threshold, often in highlands where streams start) down to the outlet.

4. **Place Lakes:** Identify depressions in the flow network. If a tile is a local minimum (no downflow outlet lower than itself) and not at ocean, water will collect. Our basin delineation would have found endorheic basins this way. We fill the depression up to the rim elevation (imagine pouring water until it spills out or reaches evaporation equilibrium). To simulate this, we can "flood-fill" from the lowest point outward until encountering higher terrain; the fill level becomes the lake's shoreline. If that fill never finds an outlet, that's an endorheic lake at equilibrium (likely salt lake). If it finds an outlet at some higher level, then the lake fills until it spills over – then beyond that point the system becomes exorheic (the lake drains out via a river at the spill point). We might incorporate evaporation by not filling to the brim if climate is arid (i.e., the lake might stabilize below the rim because evaporation = inflow). But this is complex; a simplification is to either fill completely or not at all. For now, mark lakes at any interior basin low point.

   We should also consider glacial lakes: climate might put ice in some basins – if so, those could either be left as ice-filled or as meltwater lakes if in warmer season. Possibly skip detail.

5. **River Flow & Volume (Optional):** We could compute relative volume or size class of each river from the accumulation (like Amazon vs a small creek). For game visuals, maybe bigger rivers are drawn thicker. Volume also depends on climate: a river in a rainforest will carry more water than one in an equally large basin in a desert (because less rain overall). So volume = accumulated precipitation integrated over area. We can categorize rivers (e.g., large, medium, small) based on that.

6. **Wetlands and Floodplains:** In flat areas adjacent to rivers or in lake basins, water may spread out. If a river tile has a very slight slope and high flow, that could indicate a swampy floodplain. Or if the flow algorithm shows that water doesn't have a strong single channel (like in a very flat interior delta), we could mark a wetland. This might be beyond first implementation, but conceptually: high rainfall + low drainage = wetland.

7. **Groundwater/Aquifer (Placeholder):** We acknowledge that some water goes underground. We might not simulate this explicitly. However, we could note regions that would logically have ample groundwater (e.g., porous rock + sufficient recharge from rain). Perhaps simply mark "water table high" in certain areas like river valleys and near large lakes. This could come into play if later we want wells or oasis generation in deserts (e.g., a desert valley that gets underground flow might sustain an oasis).

8. **Integration with Terrain:** Optionally, adjust terrain slightly where rivers flow – perhaps carve the river valley a bit more or flatten the riverbed. But major carving was done in geomorphology. At this stage we might just ensure that the river follows the lowest route; if we find any unrealistic rises along a river path (digital dams), we could lower them to ensure continuous downhill flow (geomorph should have handled this though).

9. **Output Geometry:** Perhaps convert the river network into polyline data for use in map rendering (a sequence of coordinates through tiles). Lakes into polygon areas. These geometry outputs are for visualization or placing features (like fish resources, or allowing navigation, etc.).

**Inputs & Outputs:** Inputs needed are the _precipitation map_ and _evaporation/climate info_ (we have temperature, which can inform evaporation rates), and the _heightmap with flow directions_. Optionally the _soil permeability map_ if we consider infiltration (e.g., sandy soil absorbs more water, leaving less runoff). Initially, we might ignore soil feedback and assume a fixed runoff coefficient (say a certain percentage of rain becomes runoff).

**Outputs:**

- **River Network Map:** A raster or vector indicating which tiles have rivers and possibly the river's flow direction along that tile. Could include river order or size.
- **Lake Map:** A map of lake coverage (which tiles are lake surface) and lake depth (if needed – depth can be inferred from difference between tile elevation and filled water level).
- **Drainage Basins Map:** Perhaps each tile labeled with a basin ID and whether that basin is endorheic or which ocean it drains to. This can be useful for analysis (e.g., highlight the largest basin on each continent, etc.) and could feed into soil (sediment distribution) or ecology (different vegetation near different rivers).
- **Wetland Mask:** Tiles that are marsh or swamp.
- **Outflow Points:** For each river that reaches the ocean, mark the delta or estuary tile (could be useful for placing fertile delta regions or trade harbors in game).
- **Aquifer/Water Table info:** Possibly a simple boolean map of tiles where groundwater is abundant (e.g., near large rivers or in humid climates with permeable soils).

Many of these outputs might be optional depending on how deep we integrate hydrology. For now, a basic output is just rivers and lakes, since those are noticeable world features.

**The Levers (Parameters):** Since we plan to keep hydrology simple initially, we may not expose many levers here in the first pass. But some that could exist:

- **Rainfall Runoff Fraction:** A global setting for what proportion of precipitation becomes surface runoff versus soaks in. Higher value means more and larger rivers (as if the ground is largely impermeable or very wet), lower means fewer surface water (e.g., in a very sandy or flat area, water might just sink or evaporate leaving intermittent streams).

- **River Density Threshold:** Essentially the threshold for forming a river in the flow accumulation algorithm. Tuning this decides if the world has lots of minor streams drawn or only major rivers. A lower threshold yields a denser river network (maybe good for a wet world or a smaller map where more rivers add detail).

- **Lake Level / Dryness Threshold:** This could adjust how readily lakes form. A high setting might favor forming lakes in any slight depression (representing a world where evaporation is low or terrain is such that lakes persist). A lower setting might mean we only keep very large or deep lakes, others are assumed to dry out. This can convert marginal lakes to either appear as salt flats or seasonal playa (dry most of the time).

- **Floodplain Size:** If we had an implementation for wetlands, this lever could widen or shrink how much area around rivers is marked as floodplain. Possibly tied to something like "river mobility" – high if rivers meander widely creating broad swamps.

- **Groundwater Depth:** If we wanted to simulate oases, this lever could mean in deserts whether groundwater is accessible (shallow) or too deep, affecting where any unexpected greenery might appear. Possibly not needed at global scale, more of a local feature.

Given the current plan, we might just keep a couple of these under the hood and not expose them until needed.

**Abstraction Strategy:** The hydrology simulation is essentially a graph traversal on the terrain:

- We already have or can easily compute a downstream pointer for each tile (the neighbor with lowest elevation, accounting for maybe multiple flow if plateaus exist – we might enforce a single direction by some tie-break). This gives a directed acyclic graph (assuming no loops – if loops, we have a closed basin).

- Using that, performing flow accumulation is classic: do a topological sort from highest to lowest or use recursion/memoization.

- Lakes are trickier but we can do the standard depression filling: for each closed basin, raise the water level until it reaches an outlet or a stable size. There are known algorithms (e.g., using priority flood where you flood from the edges inward).

- But since our geomorphology likely already ensured no deep un-outlet basins except intended ones, we can identify endorheic basins by checking basin outlets: if a basin's lowest border is above sea level and entirely enclosed by higher land, that's endorheic. Then we can simulate a lake at the lowest point. The size of that lake could be estimated by water balance: precipitation in basin vs evaporation in basin. If P > E, lake will expand until it finds an outlet (or floods a huge area); if P < E, lake will shrink or be seasonal. Possibly just fill to a size where the area _E = volume of inflow_ P, but that's too involved; simpler to decide that in very dry climates, endorheic basins might just be salt flats or small ephemeral lakes.

- For our first implementation, we might simply say: if an endorheic basin is in a dry climate, mark a salt flat (no permanent lake), if in a wet climate or large basin, mark a lake at the lowest 1-tiles of that basin.

- We will not simulate dynamic river meandering or changes – just static channels following steepest descent.

- Ensuring numerical stability: tile-based routing can sometimes cause artifacts (like two big rivers merging and then the combined river seeming smaller if resolution issues). We will try to correct by always accumulating.

- If any weird loops or sinks remain, we may manually break them (like if a plateau with no single lowest neighbor, water might just pool – maybe declare a shallow lake).

- Because map size is moderate (~10k tiles on large maps), these computations are light. Even flow accumulation (linear time) is fine. So performance is not a big issue.

- We will initially implement hydrology in a cursory way: perhaps just find major rivers and one lake per big basin to have something. The detailed tuning can come later if we see rivers/lakes are an important gameplay lever.

Finally, we keep hydrology somewhat modular so it can be skipped or simplified (for example, if we find rivers aren't needed explicitly beyond climate moisture distribution, a designer could turn off visible rivers). But since rivers and lakes add realism and affect biomes (e.g., enabling fertile land in otherwise arid zone), we plan for them even if initially approximate.

| Hydrology Inputs | Hydrology Outputs | Key Levers | Downstream Usage |
|---|---|---|---|
| - Precipitation map (from climate)<br>- Evaporation potential (from temp & climate zone)<br>- Heightmap & flow directions<br>- Soil permeability map (optional) | - River network (tiles with rivers + flow direction)<br>- Lake locations and extents<br>- Drainage basin map (with outlet info)<br>- Wetland areas (if any)<br>- River flow volume classes (optional) | - _Runoff Coefficient_ (what % of rain forms rivers)<br>- _River Threshold_ (defines how fine the river network is)<br>- _Lake Formation_ (likelihood of lakes in basins)<br>- _Floodplain Extent_ (river valley wetness) | - **Soil/Pedology:** lakes and floodplains influence soil deposits (clays, organics in wetlands); river plains often have rich alluvial soil. Also groundwater levels could affect soil moisture regimes.<br>- **Ecology:** presence of fresh water is critical for biome placement (e.g., forests cluster along rivers in savannas, oases in deserts). Lakes and wetlands create unique biomes (marsh, mangroves).<br>- **Gameplay/Resources:** Rivers may determine city placement (in Civ games, rivers provide fresh water/agriculture bonus). Also hydro power or fish resources in lakes, etc. |

## Pedology & Geology (Soil & Resources)

**Real-World Domain:** This domain covers the formation of soils (pedology) and the distribution of geological resources like minerals and fossil fuels. It serves as a bridge between the abiotic world (rocks, climate) and the biosphere (since soil fertility affects vegetation). Key principles:

- **Soil Formation (CLORPT):** Soils develop from the weathering of rock and the accumulation of organic matter. The state of soil at any location is a function of **Climate, Organisms, Relief, Parent material, and Time** – often summarized by the acronym CLORPT.
  - _Climate:_ Temperature and moisture influence the rate of weathering and organic decomposition. Warm, wet climates produce soils faster (and leach nutrients more) than cold or dry climates.
  - _Organisms:_ Vegetation types and microbes contribute organic matter and help mix the soil. Grasslands, for example, often produce thick, fertile topsoil due to abundant root matter, whereas conifer forests produce acidic, thinner soils.
  - _Relief (Topography):_ Slope and drainage affect soil depth – soils on steep slopes erode away, so mountaintops may have thin or no soil (exposed rock), while valleys accumulate deep soils from sediment. Aspect (north/south facing slopes) can change microclimate and thus soil moisture.
  - _Parent Material:_ The type of rock or sediment the soil forms in. Granite might produce sandy, acidic soil; limestone yields more alkaline, clay-rich soil; volcanic ash can produce very fertile soil (rich in minerals). If the area has transported material (like river deposits or glacial till), that also influences soil properties.
  - _Time:_ Soils get more developed (thicker, more horizons differentiated) over time if other factors remain stable. Young soils might just be a thin layer above rock; old soils (like in the tropics, undisturbed for millions of years) can be very deep and heavily leached (laterites).

- **Soil Horizons:** Real soils have layers (topsoil rich in organic matter, subsoil with clays/oxides, etc.). We probably won't simulate detailed horizons, but it's useful to note that some soils are fertile (lots of nutrients, organic matter) while others are weathered and infertile. For instance, tropical laterite soils are often nutrient-poor despite lush vegetation, because heavy rains leach nutrients and most fertility is in biomass. Conversely, temperate grassland soils (chernozems) are extremely fertile with high organic content. Deserts often have thin soils or just raw mineral soil with salts.

- **Permafrost:** In very cold climates (tundra, polar), the ground can remain frozen below the surface (permafrost). This affects drainage and soil – water can't percolate, leading to boggy surface in summer and trapping organic carbon (peat) in frozen layers. If our climate has areas below 0°C mean annual, we should mark permafrost presence. That strongly limits vegetation (only shallow roots) and can create unique landforms (polygons, etc., though we won't simulate those).

- **Geological Resources:** The distribution of resources like coal, oil, metals is tied to geological processes:
  - _Coal:_ Coal forms from ancient plant material in swamps and peat bogs, buried and compressed over geologic time. The biggest coal deposits were laid down in specific eras (e.g., the Carboniferous period) in vast coastal swamps. Geologically, one often finds coal in sedimentary rock layers that were once wetland forests or peat bogs on deltas or floodplains. In our world context, that means areas that are flat, low-lying, and had lush vegetation for long periods (e.g., near inland seas or wide river basins in tropic or temperate climates) could have coal. If our simulation had snapshots, we might simulate "150 million years ago this was a swamp" – but without full history, we may approximate by looking at current lowland tropical areas (for analogy) or known sedimentary basins.
  - _Petroleum (Oil & Gas):_ Oil originates from marine microscopic organisms (algae/plankton) that settle in anoxic conditions and get buried under sediment. Typically this happens on continental shelves or shallow seas that later get trapped. Over millions of years, pressure cooks it into hydrocarbons. Oil is often found in _sedimentary basins_ at edges of continents or in former inland seas (e.g., the Persian Gulf, which was under the Tethys Ocean; or the Gulf of Mexico). It requires a porous reservoir rock capped by impermeable layer (geology detail we won't simulate, but we can infer likely basins). So likely places for oil in our generated world: along continental shelf margins, especially where large deltas have dumped sediments into shallow seas, or in broad interior basins that were once underwater. Also, warm climates with high productivity might produce more initial organic matter (but in Earth history, even cooler seas can produce oil).
  - _Iron:_ Iron ore in the form of _banded iron formations (BIFs)_ is actually extremely old (Precambrian, formed when Earth's early oceans had iron and oxygen from early life precipitated it out in layers). Those are mostly in ancient cratons (e.g., Western Australia, Minnesota, etc.). More generally, minable iron can come from BIF or from lateritic soils rich in iron (like laterite caps in tropics can be iron-rich) or from magmatic processes (iron-rich gabbro intrusions). For simplicity, we might place iron resources in old continental shield areas (the cores of continents that were least affected by recent tectonics) or in hilly regions where erosion exposed ancient banded iron layers. If our tectonic model identifies "ancient terrain" vs "new orogeny," the ancient ones likely host BIF deposits. We might also put some iron in mountain ranges as generic metal deposits.
  - _Other Metals:_ (Though not explicitly asked, we consider if needed) – Many metals (copper, gold, etc.) are associated with igneous and hydrothermal activity (volcanic regions or old plate boundaries). We could generalize that metal ores are near mountains or volcanoes.
  - _Fertile materials:_ e.g., phosphate or potash might occur in old seabeds or guano deposits – possibly too fine detail.
  - _Groundwater (as a resource):_ Large aquifers might coincide with sedimentary basins (like the Ogallala in US plains). If we were doing water resources, we'd note those in large flat inland areas.
  - _Stone/Marble etc.:_ If needed for flavor, e.g., certain rocks for construction could be tied to geology (marble in metamorphic regions, etc.), but game might not need that detail.

The question specifically asked coal, iron, oil – classic Civ resources. We've addressed those: coal ~ ancient swampy sediments, oil ~ continental shelf/depositional basins, iron ~ ancient banded iron in old crust or mountain ores.

- **How Climate and Soil tie to Resources:** Interestingly, soil type can indicate some resources: e.g., laterite soils can have bauxite (aluminum ore) concentrated. Coal near surface can affect soil (coal seams can be shallow). But probably out of scope – we will treat resource placement mainly geologically with perhaps climate context (coal in what are now mid-latitude regions that had lush growth historically).

- **Time and snapshots:** If we had a "geologic history" simulation, we'd place resources by simulating past epochs. Without that, we will approximate:
  - We can use a notional "age" field from Foundation (some continents are old, some mountains new). Place ancient resources (iron, maybe some coal) in the old cratons, place coal in basins on those continents that we assume were long-term lowlands with vegetation, place oil in offshore or basin areas of those old continents if they were flooded.
  - If we did tectonic kinematics, maybe we can guess which areas were once at equator (but unless we track lat drift, probably not).
  - We might randomize within constraints to ensure game balance as well (not all resources clump in one area, etc.).

**Simulation Staging (Order & Steps):** The Pedology & Geology stage uses input from climate (for climate factor of soil), from geomorphology (parent rock types, elevation/slope), and from hydrology (areas of deposition or saturation). It comes after hydrology because things like river deposits and lake beds will influence soils and because resources are placed once we know where water and life are (for coal, etc.). It's somewhat parallel to ecology (which is next) – in reality, soil and vegetation co-evolve. But in our pipeline, we'll derive soil first, then use it to help determine biomes.

Steps could be:

1. **Parent Material Identification:** Start by tagging each land tile with a "parent material" for soil formation. This could be directly the rock type from Foundation (igneous, metamorphic, sedimentary). But note that many surfaces are covered by transported material:
   - If a tile is in a river floodplain or delta, parent material is alluvium (sediment) rather than bedrock.
   - If a tile is glaciated (in past or currently), there might be glacial till.
   - Volcanic regions might have ash deposits.
   - We use geomorphology outputs: sediment depth map, volcano locations, etc., to adjust parent material.
   - So e.g., low flat areas likely have "sedimentary cover" (sands, silts), steep mountain might be bare rock or thin soil on bedrock.

2. **Climate Influence:** Use the climate maps (temp, precip) to determine the degree of chemical weathering and organic accumulation:
   - In warm humid climates: high weathering -> soils tend to be deep, heavily leached (nutrients washed out, iron/aluminum oxides left). Possibly laterite in tropics (red, iron-rich, low fertility).
   - In cool or arid climates: slower weathering -> thinner soils, or in arid maybe accumulation of salts (caliche) because evaporation leaves minerals behind.
   - In seasonal climates: moderate depth, often fertile (like deciduous forest soils, mollisols in prairies).
   - We'll assign a preliminary soil type based on climate zone and parent material combo. For example:
     - Tropical rainforest on igneous rock -> lateritic soil (oxisol) – poor for agriculture.
     - Tropical savanna on volcanic ash -> maybe fertile black soil (as in some East African highlands).
     - Temperate grassland on loess or alluvium -> very fertile chernozem.
     - Desert on any rock -> thin desert soil or dunes (if sand).
     - High mountains (cold) -> little to no soil (bare rock or alpine scree).
     - Tundra -> permafrost soils (gelisol) with peat on top.
     - Wetland -> histosol (peaty soil) high in organics.
   - We don't need to name these formally, but the distinctions matter for fertility and biome.

3. **Soil Depth and Fertility:** Compute a value for soil thickness or quality for each tile. This might be a continuous field or categorical (poor, moderate, rich). Factors:
   - Flat lowlands accumulate soil (deep). Steep slopes lose soil (shallow).
   - Floodplains and deltas constantly get new sediment (often very fertile).
   - Volcanic ash can be fertile initially (lots of minerals) though that depends.
   - Long-term stable uplands in tropics might have deep soil but nutrient-poor.
   - We might assign a "fertility index" that considers organic content and nutrient availability. E.g., grassland with moderate rain yields high organic = high fertility; rainforest yields low nutrient (most locked in biomass) = surprisingly not so fertile once cleared.
   - For gameplay, however, one usually expects jungles to be depicted as rich (even if IRL that soil isn't great for farming, Civ-type games sometimes fudge this).
   - We could aim for realistic but ensure every region has some productive land type to avoid unplayably poor areas.

4. **Resource Placement:** Now, using geological context:
   - **Coal:** Find areas that are currently land, were likely low-lying and vegetated for long periods. Candidates: large sedimentary basins in temperate/tropical zones. If we had a "geologic age" map from tectonics (like which areas haven't been uplifted recently), we can combine that with current climate or past climate. Another approach: if a tile is now a broad flat plain with lots of sediment and was near a coast (or currently near one), that's analogous to conditions where coal could have formed. We might scatter a few coal deposits in such plains or near foothills of old mountains (like how Appalachia has coal from ancient swamps during Pangea era).
   - **Oil:** Look at continental shelf tiles (shallow ocean along coasts) – those are prime for offshore oil. Also consider interior basins that are below sea level or used to be sea (like a tile that is currently land but below some elevation threshold could have been a sea once). Possibly also near large river deltas (where lots of organic sediment went into the sea). We can place oil either in shallow ocean tiles (offshore rigs) and/or on adjacent land (assuming there's oil underground that's drilled on land, like the Persian Gulf oil fields extend on land). In Civ games, oil often appears in deserts (Middle East) or tundra (Siberia) or offshore. So our criteria could include: desert or tundra flat areas that were ancient seas (which fits Earth: Middle East was Tethys Sea, Arctic was shallow sea), and offshore of coasts generally.
   - **Iron:** Identify old crust or specific rock types. For simplicity, place iron in hills or mountains (as mines) broadly, because iron is fairly common. But to follow realism: maybe concentrate iron in ancient shield regions (if our tectonic model gave us any, e.g., a continental interior far from plate edges). Also near volcanoes or island arcs (some iron deposits are in volcanic regions via hydrothermal). However, gameplay usually has iron in hills anywhere. We can ensure distribution by placing some iron in various regions, but weighted by geology: e.g., a cluster in an old mountain range (representing banded iron or iron-rich metamorphic rock), a few on shields (like Brazil or Australia analogs), and maybe a couple in other random hills.
   - We must keep game balance in mind: we'd ensure at least each major landmass has some of each key resource. So even if geologically one continent might lack oil, we might fudge and give it some anyway.
   - **Other resources (if considered):** E.g., _Copper_ could be placed at volcano/hydrothermal zones. _Gold_ maybe in either placer deposits (river valleys from eroded mountains) or near old metamorphic belts. _Uranium_ in certain ancient rocks or desert dry lakes (some uranium comes from evaporites).
   - Because the prompt specifically called coal, iron, oil, we focus on those for analysis.

5. **Finalize Soil & Resource Maps:** We output the soil type/class map and a resource deposit map.
   - Soil map might categorize each tile into maybe 5–10 types (e.g., tundra soil, desert soil, tropical red soil, fertile loam, etc.) or just give numeric fertility and a moisture category.
   - Resource map will mark certain tiles (or small clusters) as containing a resource. Ideally, tie them to the soil/geology: e.g., coal on a tile that is in a sedimentary basin often with a certain soil; oil in a desert or shelf tile; iron in a hill with thin rocky soil.
   - Possibly also a groundwater availability map if needed (like marking which desert tiles have an aquifer – could be based on adjacency to mountains or rivers).
   - Additionally, note where rare soil conditions occur: e.g., salt flats (in endorheic desert basins, which could count as resource like "salt").

6. **Calibration with Earth Analogs:** Check that our placement roughly can recreate known patterns if similar geography occurs. For example, if our world had a large inland sea that dried into a desert, we should probably put oil or salt there. If a big swampy region exists in warm latitudes, mark a coal deposit or peat (maybe peat could be a resource or just a feature). If an ancient mountain region exists, put iron or other metals. This qualitative validation ensures plausibility.

**Inputs & Outputs:** Inputs:

- From Foundation/Geomorphology: _rock type map_ (which areas are sedimentary vs igneous vs metamorphic), _age or tectonic stability map_ (which might indicate ancient craton vs active orogen; not explicitly produced earlier, but could be derived from e.g., distance from plate boundaries).
- From Climate: _temperature & precipitation_, which we distill into climate zones (used for soil type, e.g., arid, humid, etc.), and _permafrost indicator_.
- From Hydrology: _drainage/wetness_ info (floodplain extents, endorheic basins, etc. which tells us if soil is waterlogged or if salts accumulate).
- Possibly _vegetation pre-ecology_ (though we haven't done ecology yet, but we might infer vegetation type from climate for soil purposes, e.g., assume grass vs forest depending on rainfall to determine organic content).
- But since ecology comes next, we might do an iterative or just use climate as proxy: for example, high rainfall + no extreme cold -> likely forest cover, so more organic; moderate rainfall + seasonal -> grassland, high organic in topsoil, etc.

**Outputs:**

- **Soil Type Map:** Each tile labeled with a soil category or at least fertility index + moisture regime. Could include things like: "sandy desert soil (low fertility)", "chernozem (very fertile)", "laterite (low fertility)", "podzol (acidic forest soil)", "peat (wetland soil)", etc. The level of detail depends on how we use it. Likely, we at least want to differentiate fertile land (good for agriculture) vs poor land.
- **Soil Depth Map (or Erosion Rate Map):** Possibly a numeric field of how thick soil is (thin soil means any agriculture is hard, also means terrain is rocky). This could tie into the terrain's roughness/appearance too.
- **Permafrost Map:** Mark tiles with permafrost (overlap with climate, but output for clarity).
- **Resource Deposits Map:** Mark presence of Coal, Oil, Iron (and possibly others if needed) on specific tiles. This would include both location and an estimate of quantity/quality if needed (for game it might just be boolean presence).
- **Geologic Province Map (optional):** As an intermediate, maybe mark out sedimentary basins, shields, mountain belts etc., which is more of a debug thing. But it could be useful if one wanted to reason further about resource distributions or share with ecology (e.g., certain plants prefer certain substrates).
- **Terrain Material Map:** Slightly different from soil – could indicate what's at the surface: sand, clay, rock, etc. Could be used for rendering textures or for determining if an area is a desert dune (sand) vs stony desert.

**The Levers (Parameters):**

- **Primary Levers:**
  - **Resource Abundance:** A global scalar to increase or decrease the frequency of resource deposits. This is useful for gameplay tuning – e.g., a scenario with scarce resources vs resource-rich world. It would multiply the chances of placing any given resource.
  - **Soil Fertility Bias:** A lever to make the world's soils generally more fertile or more barren. High fertility could mean even tropical soils miraculously hold nutrients (maybe to make jungles more agriculturally useful in game). Low fertility could make it more challenging to farm, requiring players to seek specific fertile areas.

- **Secondary Levers:**
  - **Erosion vs Deposition Balance:** This could tweak how much area ends up with deep sediment vs rocky ground. If set toward deposition, valleys and basins fill more (maybe more fertile valley soils but also more marshes); if set toward erosion, more terrain is scoured (thin soils, more exposed bedrock, fewer lakes).
  - **Resource Distribution Pattern:** Perhaps a toggle between more "clustered" vs "even spread" of resources. Realistically, resources cluster in certain geologic provinces. But for game fairness you might ensure some spread. We could have a lever that if turned toward "clustered" will place resources in larger deposits but only in a few regions (some continents might lack them), whereas "even" would sprinkle them more uniformly irrespective of geology. Probably game design would lean on even distribution with mild clustering.
  - **Geologic Unrealism Toggle:** Could allow some bending of realism (like if a user wants coal in polar tundra just for scenario, etc.), but likely not exposed normally.
  - **Organic Content Factor:** Influences how much organic matter soils accumulate. High means thick humus layers (perhaps if one wanted an especially lush biosphere with lots of peat, etc.), low means soils more mineral.
  - **Laterization Factor:** Specifically for how extreme tropical weathering is. If high, tropical areas become very leached and infertile (bad for players trying to farm jungles), if low, maybe jungles have richer soil than on Earth (an ease-of-play option).

Given our aim of plausibility, we might default to Earth-like (which already is challenging for players to comprehend, but Civ often simplifies soil fertility by tying it to tile yields rather than simulation). Many of these levers might not be directly user-facing in the game but could be dev toggles.

**Abstraction Strategy:**

- We largely use rule-based assignment for soils and resources. For soils: essentially a big if/else or lookup table keyed by climate zone + parent material + terrain position. E.g., if (Climate = Tropical rainforest) and (parent rock = Acidic igneous) and (terrain = upland) then Soil = "Laterite (oxisol), fertility low". We incorporate relief by checking if slope > threshold (then shallow rocky soil regardless of climate) or if tile is floodplain (then alluvial fertile soil).

- We could generate a couple of intermediate maps: one for "weathering intensity" (from climate: function of temp * precipitation) and one for "erosion/deposition context" (from terrain: like a sediment accumulation index). Then soil fertility might correlate inversely with weathering intensity (high weathering = low nutrients left) but positively with deposition (areas of deposition bring new minerals).

- Ground truth with known: e.g., Earth's breadbaskets are in temperate grasslands on deep loess or alluvial soils (US Great Plains, Ukraine, etc.). Our algorithm should yield high fertility in analogous places: mid-latitude interior plains with moderate rain. Tropical rainforest areas in reality have poor soil but produce abundant life by rapid nutrient cycling – in game terms, those tiles often still yield a lot (food) if forest present, but if cleared might be poor farmland. We can simulate that by low soil fertility but the ecology stage giving them productivity through biomass.

- For resources:
  - We can generate a probability map for each resource type: e.g., Oil probability = 1 if tile is shallow sea; 0.5 if tile is desert flat and near sea level; etc., times some random factor. Then place a fixed number of oil resources according to highest probabilities, ensuring some spacing.
  - Similarly for coal: probability high in large flat humid areas that have been stable; some chance in high latitude peat bogs as "future coal" though not actually coal yet but game might not distinguish.
  - Iron: probability high in old highlands or around volcanoes. We could ensure each major mountain range or shield area gets at least one iron.
  - Use random selection moderated by these probabilities to actual place discrete deposits.
  - The size/quantity of deposit likely not modeled beyond one deposit = one source for game purposes.
  - We ensure not to place resources in obviously unrealistic spots: e.g., oil probably wouldn't be on top of a high mountain or in the middle of a shield (unless that was ancient sea), coal likely not in tiny islands, etc. Our rules filter those out.
  - Given no actual time simulation, our approach is a best-effort static approximation using current clues for past processes.

After this stage, we have a world loaded with the "substrate" information: what kind of soil covers each region and what key resources lie beneath. This sets up the stage for life to occupy the land in the Ecology stage, and also ensures that gameplay can later access those resources logically.

| Pedology Inputs | Pedology Outputs | Key Levers | Downstream Usage |
|---|---|---|---|
| - Rock type map (bedrock geology)<br>- Terrain stability/age (implied by tectonics)<br>- Climate maps (temp, precip, climate zones)<br>- Hydrology (wetlands, floodplains, basins)<br>- Land cover proxy (we assume vegetation from climate) | - Soil type map (classification of soil per tile)<br>- Soil fertility index (e.g., numeric yield potential)<br>- Soil depth/quality map<br>- Permafrost extent (frozen ground areas)<br>- Resource deposits map (locations of coal, oil, iron, etc.)<br>- Geological province map (optional, for debugging) | - _Resource Abundance_ (frequency of coal/oil/iron)<br>- _Soil Fertility Bias_ (overall richness vs poor quality)<br>- _Erosion-Deposition Balance_ (soil depth distribution)<br>- _Resource Distribution_ (clustered vs even) | - **Ecology:** Vegetation growth depends on soil fertility and moisture. Fertile soils support dense productive ecosystems (grasslands, deciduous forests) whereas poor soils might limit biomass (sparser forests, heath). Certain biomes (e.g., bogs, mangroves) require specific soil/water conditions. Soil also affects which crops can be grown (in a civ context, but that's gameplay beyond world gen).<br>- **Gameplay (City placement & Resources):** Players will seek resource tiles (coal for industry, oil for modern units, iron for weapons). Soil fertility might translate to tile yield bonuses (rich soil = more food). Also, soil type could affect movement or construction (e.g., marshy soil impedes movement). In world narrative, soil and resource maps add depth (explains why a region is prosperous or not). |

## Ecology (Biomes)

**Real-World Domain:** Ecology here refers to the distribution of living ecosystems (biomes) across the planet, given all the physical conditions we've modeled (climate, soil, hydrology). A **biome** is a broad classification of the ecosystem type (desert, rainforest, tundra, etc.), determined largely by climate but with important influences from soil and terrain. Key factors and concepts:

- **Climate as Primary Driver:** The classic Whittaker diagram relates biomes to annual precipitation and temperature. Warm and wet yields tropical rainforest; warm and dry yields desert; cool and wet yields boreal forest or temperate rainforest; cool and dry yields cold desert or steppe, etc.. This gives a first approximation of biome based on climate variables alone.

- **Seasonality:** Not captured by just annual means – for instance, a climate with 6 months rain and 6 months dry (monsoon savanna) versus one with year-round moderate rain (evergreen forest) might have the same annual totals but different biomes. So we consider seasonal distribution: climates with a long dry season often support grasslands or savanna instead of forest, even if annual rainfall is fairly high. Monsoon forests may be deciduous, shedding leaves in dry season, whereas ever-wet climates have lush evergreen broadleaf forests.

- **Soil and Drainage:** These refine biomes:
  - Poor, sandy or acidic soils might support pine forests or heathland instead of productive broadleaf forests, even in a climate that could support better growth. For example, the difference between a nutrient-poor sand plain (scrub or pygmy forest) and a nearby loam soil (tall forest) can be striking.
  - Waterlogged soils create wetlands (swamps, marshes) instead of what climate alone might suggest. A temperate poorly drained area becomes a marsh with reeds or swamp forest, not a regular dry-land forest.
  - Very thin soils on rock or steep slopes might have sparse vegetation (e.g., alpine scree with only lichens and sparse grass, even if climate would allow more if soil were present).

- **Topography (Altitude):** Elevation creates vertical zonation: as you go up a mountain, temperature drops and often so does available moisture (cloud behavior can vary). You can find different biomes stacked: e.g., tropical base with rainforest, then montane forest, then cloud forest, then grassland, then bare alpine zone. We simulate some of this via the temperature lapse rate in climate, but we may need to explicitly enforce alpine biomes above a certain elevation (tree line). E.g., above ~3000m in tropics or ~2000m in temperate, the biome might shift to alpine tundra (regardless of precipitation).

- **Disturbance Regimes:** Fire, storms, grazing – these also shape biomes. For instance, grassland vs forest can depend on fires and herbivores maintaining an open landscape. In our simulation, we won't explicitly simulate fires, but we might implicitly decide that certain climates naturally become savanna (grass with scattered trees) rather than closed forest if they have a marked dry season or if soils are such that grasses out-compete trees. We can base that on known patterns (e.g., tropical savanna in areas of seasonal rain and maybe on somewhat less fertile soils; Mediterranean shrubland in areas of winter rain but hot dry summers which encourage fires).

- **Biotic factors & Feedback:** Vegetation itself can influence microclimate (forest retains more humidity under canopy, etc.), but that's a level of detail we likely skip. However, vegetation can influence albedo (e.g., snow-covered tundra vs dark forest). We probably integrated that by adjusting climate already (e.g., tundra region with snow remains cold – though actually if forest were there it'd absorb more sun and be warmer; this is an interesting feedback, but in Earth high latitudes forest vs tundra does matter for climate. We might ignore).

- **Biodiversity and Edge Cases:** Earth has some biomes beyond the basic Whittaker diagram:
  - **Mangroves:** Tropical coastal wetlands where salt-tolerant trees grow. Requirements: warm temperature (frost-free), along calm shallow saltwater (river deltas, lagoons). We could place these in tropical coasts where freshwater meets ocean.
  - **Cloud Forests:** In tropics or subtropics on mountains where persistent cloud moisture occurs (often ~2000m elevation band). Very lush, mossy forests with lower temperature but high humidity. We may not detail this specifically, but it's an example of how mountain climates can be wetter at mid-elevation (due to orographic cloud bank) then dry above (some high plateaus are arid above the cloud layer – e.g., Tibet has alpine steppe).
  - **Permafrost peatlands:** Cold wetlands in subarctic, lots of peat and bog (muskeg). This would be integrated if we mark wetlands + cold climate.
  - **Mediterranean biome:** Mild wet winters, hot dry summers (like around Mediterranean, California, etc.) leading to sclerophyllous shrubs and open woodlands (chaparral). Climate stage would identify seasonal pattern (winter rain). We should ensure not to classify those as temperate forest or desert incorrectly.
  - **Temperate rainforest:** Extremely wet but cool areas (like Pacific Northwest, New Zealand). These have giant conifers or broadleaf forests. Occur where you get oceanic climate with constant rain (e.g., west coasts at mid-latitude with orographic help). Our climate might produce those if a coastal mountain gets heavy rain year-round.
  - **Savanna vs Desert transition:** A gradient exists as rainfall increases from true desert (<250 mm/year) to semi-arid steppe (250–500 mm, grassland with few trees) to savanna (500–1000 mm with distinct dry season, mix of grass and trees) to seasonal forest (>1000 mm but seasonal, more trees). We should categorize carefully in that range.
  - **Biomes and Soil/Resource Feedback:** Certain biomes only occur if soil permits. Example: rainforests usually require well-drained soil (waterlogged areas in same climate become swamp). Prairies/grasslands often are found on more fertile soils that can support thick grass but interestingly could also support forest in absence of fire – but historically, interplay of fire and maybe slightly less rain kept them grass. We might fudge and rely purely on climate for grass vs forest except in edge cases like if precipitation is borderline and soils are very fertile, maybe a bias to grassland? Possibly not – might keep it climate-driven plus a fire-season rule (monsoon climates with a long dry period lean savanna).
  - **Human or Animal Influence:** Not modeling that explicitly (no agriculture or deforestation in world gen). We assume "natural" biome distribution.

**Simulation Staging (Order & Steps):** Ecology is the last stage, consuming everything else. It uses climate for the broad strokes, then refines with soil, hydrology, and maybe subtle topography cues. Steps:

### 1. Initial Biome from Climate (Climatic Biome Map)

Based purely on the temperature and precipitation (and seasonality) we assign a preliminary biome to each tile. Essentially, this is placing each tile on the Whittaker diagram or similar classification. We also consider elevation-driven biomes: e.g., if temperature indicates tundra or if elevation above tree line, mark as alpine tundra regardless of precipitation (unless it's an ice cap).

For example:

- Tropical (frost-free, avg >~18°C) and high rainfall year-round -> Tropical Rainforest.
- Tropical with high annual rain but strong dry season -> Tropical Seasonal Forest or Savanna (depending on length of dry season and total rain).
- Tropical with low rain -> Hot Desert (if very low) or Thorn Scrub (semi-desert).
- Arid but cold winter (mid-latitude interior) -> Cold Desert or Steppe.
- Temperate (moderate temp, some frost): if high precip year-round -> Temperate Broadleaf Forest; if precip is moderate -> Temperate Mixed/Seasonal Forest or Prairie depending on distribution; if low -> Steppe (grassland) or Desert if very low.
- Mediterranean climate (wet winter, dry summer, moderate temp) -> Mediterranean Woodland/Shrub (chaparral).
- Cold (subarctic): decent precip -> Boreal Forest (Taiga); lower precip -> Cold Steppe; very low -> Cold Desert (like Gobi).
- Polar (tundra climate: very cold, short cool summer, minimal trees can grow) -> Tundra (if some summer melt and modest rain) or Ice Cap (if even summer <0°C or very high elevation).
- High altitude in tropics might be treated like temperate or sub-polar climate depending on height (e.g., Andes high plateau is cold and dry -> alpine desert).

These categories are broad; we will refine next steps.

### 2. Apply Soil/Water Modifiers

- If a tile is marked as flooded or wetland (from hydrology: near rivers or in endorheic basin with poor drainage), adjust biome to a wetland type. The type depends on climate: e.g., tropical + wetland = swamp (tropical swamp forest or mangrove if on coast), temperate + wetland = marsh or swamp forest (like cypress swamp), cold + wetland = bog (muskeg).

- If permafrost present, the biome cannot be forest beyond a certain point even if climate precipitation would allow it – likely it becomes tundra/moss/lichen landscape because roots can't penetrate frozen ground. So if climate said "boreal forest" but we have continuous permafrost and perhaps poorly drained soil, it might transition to tundra bog.

- If soil is extremely poor (nutrient-poor sand or heavy laterite) and climate borderline, we might shift from forest to more scrub/grass. E.g., some tropical areas on white sand support heath-like forests or savanna instead of dense jungle. This might be too fine, but could add realism in large sandy areas.

- If soil is very fertile and climate could support either grass or forest, it might actually encourage forest (trees grow well). However, historically, very fertile flat areas turned into grassland in absence of disturbance only because fires or large herbivores prevented forest. This is complex; we might not simulate that feedback directly. In a natural sense, fertile rain-fed land would become forest unless something stops it. So maybe ignore fertility's effect on biome (except as above for poor soil limiting forest).

- Check rocky terrain: if slope is high or soil depth negligible, represent as either bare rock or alpine grass if climate allows. For example, a steep sunny slope in Mediterranean might be rocky scrub rather than dense shrubland.

- Mangrove: If a tile is on a tropical coastline and also a delta or lagoon (some saltwater + freshwater mix, flat), consider setting it to Mangrove swamp rather than regular land biome or open water. But if we treat it as part of ocean or hydrology already, maybe not needed explicitly as a tile (could be a feature).

- Fire and grass vs forest: Introduce a rule: if annual precipitation is in a range where both grassland and forest are possible (say 500–1000 mm), decide biome based on seasonal distribution: a long dry season or frequent droughts -> grassland (savanna if tropical, prairie if temperate), whereas evenly spread rain -> forest. We have that partially from climate classification (monsoon goes to savanna). But also mid-continental interiors might lean grass (with occasional fires) even if rainfall moderate.

- Altitude: Use a threshold for tree line. E.g., define tree line temperature around 10°C summer average. If our climate data can estimate a summer temp or just see altitude > some threshold (depending on latitude), then if above tree line and not ice, assign Alpine Tundra (even if climate cell below might be forest). Also if a high mountain is in tropics, it might have a glacier on top (if above certain elevation with precip) – though we probably put that as "ice cap" in climate already if very high and cold.

- Coastal/Ocean Influence on Biome: Usually accounted by climate. But note small islands might have their own quirks (poor species diversity, etc.), which we likely won't simulate – an island just gets the climate's biome (if tropical, rainforest or palm-savanna).

### 3. Final Biome Assignment

Now we have adjusted for local factors. Assign the final biome type name to each tile. We should have a finite list of biome categories. Possibly:

- Tropical Rainforest, Tropical Seasonal Forest, Tropical Savanna, Tropical Thorn Scrub/Desert.
- Temperate Broadleaf Forest (deciduous/mixed), Temperate Rainforest, Temperate Grassland (prairie/steppe), Mediterranean Woodland/Scrub, Temperate Desert.
- Boreal Forest (Taiga), Cold Steppe, Cold Desert.
- Tundra, Polar Ice.
- Montane variants (Alpine tundra, etc., but maybe just classify as Tundra if above tree line).
- Wetland categories that overlay: e.g., Swamp (warm wetland forest), Marsh (grassy wetland), Bog (peaty, often cold wetland). These categories cover most. We can simplify some (e.g., merge similar ones if needed).

### 4. Vegetation Density and Type

As a complement to biome name, we might output what the dominant vegetation form is: e.g., forest (closed canopy, trees), woodland (open canopy), scrub, grassland, barren, etc. And maybe leaf type (broadleaf, needleleaf) or evergreen/deciduous. This helps if the game needs to render or define features. For example:

- Rainforest: dense broadleaf evergreen forest.
- Savanna: grassland with scattered trees.
- Taiga: dense needleleaf (conifer) forest.
- Steppe: continuous grass, no trees.
- Tundra: low shrubs, moss, no trees.

etc. We can derive this from biome easily.

### 5. Edge smoothing

Natural biome boundaries aren't sharp in reality; they transition. But on a tile grid, we'll have discrete jumps. We might want to avoid a single tile of rainforest in middle of savanna, etc., unless due to an abrupt climate change (which could happen on windward vs leeward of mountain). Possibly perform a little smoothing of biomes (ensuring small micro-patches maybe merge with neighbors unless strongly justified). However, distinct small biomes can exist (oases, gallery forests along rivers, etc.). Actually, that's a factor: Riparian zones – along a river in a desert, vegetation will be lusher (like the Nile banks). Our hydrology doesn't explicitly create a different climate, but we might want to reflect that some desert tiles with a big river could support narrow forests or agriculture. That might be too fine, but could mark such a tile as "river oasis" providing some fertile land in desert.

We could refine: if a desert biome tile has a permanent river, change the immediate river-adjacent environment to semi-arid grass or shrub (oasis effect). Might not be captured in resolution though; maybe assume it's sub-tile detail.

### 6. Fauna and other

Not needed explicitly, but some resources like "wildlife" could be tied to biome if game had that concept (like bison in prairie, elephants in savanna, etc.). Out of scope except maybe indirectly (not asked, but an ecological simulation might mention it, but since it's Civ7 context, resources like horses, ivory could tie to biome).

### 7. Double-check Missing

e.g., did we cover mangroves? Could treat them as a subtype of swamp in tropics on coast. Possibly just mention as flavor.

### 8. Did we consider humanlike agriculture?

The game would handle that later as players modify. So we generate pre-agriculture natural state.

**Inputs & Outputs:** Inputs:

- All physical layers: _Climate maps (temp, precip, seasonality)_, _Soil fertility and type_, _Hydrology (wetlands, rivers)_, _Topography (especially elevation for alpine zones)_, _Sea ice extent_ (to know where polar conditions are).
- Possibly _sunlight_ if we wanted to differentiate very high latitude insolation patterns (but that's inherent in climate).
- _Fire regime proxy_ (like length of dry season, which we have from climate).
- _Permafrost map_.

**Outputs:**

- **Biome Map:** Each tile labeled with a biome category (as discussed).
- **Vegetation Cover Map:** Could be an associated map with information like fraction forest cover, fraction grass, etc. For example, a savanna biome might be 20% tree cover, 80% grass; a rainforest 100% tree; a desert 0% tree 20% shrub, etc. If needed for more granular representation.
- **Land Cover Map for Engine:** Possibly a simplified map for rendering: e.g., forest, grassland, desert, marsh, ice – which might be what the game engine actually uses to place terrain art or determine base yields. Often games define terrain types and then overlays like forest or jungle on them. We can output in whatever format needed (since this is design, we just describe logically).
- **Potential Agriculture Areas:** Not exactly an output, but designers might infer where good farmland is (likely where biome is grassland or seasonal forest with high soil fertility).
- **Biodiversity hotspots (optional):** If needed, could highlight areas likely to have rich species (rainforest, coral reef if any, etc.), but game usually doesn't simulate that deeply.

**The Levers (Parameters):**

- **Primary Levers:**
  - **Biome Diversity vs Dominance:** A toggle that could make biomes more patchy and diverse, or more homogenous. For example, high diversity might break up large biome expanses into mosaic (for more visual variety, maybe smaller microclimates considered), whereas low diversity might merge them (for simplicity, one big desert rather than intermixing shrubland patches). Essentially, how strictly we follow climate vs allow local variation. This might be controlled by a noise factor.
  - **Vegetation Lushness:** A parameter to scale overall biomass. For instance, a high lushness could mean every biome is a bit more vegetated (shrubs in desert, thicker forests), whereas low lushness could mean sparser vegetation (more open canopy, more bare ground showing). Could correlate with CO₂ or something, but we treat as design lever.

- **Secondary Levers:**
  - **Forest Cover Bias:** If the user wants more forests globally (perhaps a "younger" world with more wild forests), or less (maybe more grasslands). Real world had more forest historically; humans cleared a lot. But in natural alt Earth, maybe grasses dominated more. This lever could artificially raise or lower the threshold for forest vs grassland.
  - **Wetland Percentage:** Perhaps to increase or decrease how many wetlands we generate. Could be used to simulate a world with more marshes (maybe slightly lower sea level can create more coastal wetlands, or different plant evolution).
  - **Albedo Feedback Strength:** If toggled, could integrate some iterative climate adjustment where e.g., if we set more area as dark forest, climate slightly warms locally. But likely we won't simulate that; if someone wanted to see effect of a "snowball Earth" they'd rather adjust global temperature or ice extent directly.
  - **Rare Biome Toggle:** Possibly controlling if special biomes like mangroves or cloud forests are explicitly marked or just subsumed. If turned on, we delineate them, if off we generalize (this is more for map legend complexity).
  - **Terrain Aesthetics Tweak:** Could be something like controlling how mountainous areas are rendered in terms of biome – whether we show "bare rock" vs "forested mountain" depending on preference. But that's minor.

**Abstraction Strategy:** We basically classify each tile by rules as described. This is straightforward classification and mapping, which is computationally trivial. The nuance is in the decision thresholds which we'd calibrate (e.g., what rainfall defines a desert vs steppe – can use known climate classification thresholds like Köppen: desert if annual P < ~10% of potential evap, etc.). We may incorporate a bit of randomness at edges for variety (maybe a noise function to break perfectly smooth biome boundaries – diversity lever influences that amplitude).

- Implementation is like layering constraints: Start with climate classification, then overlay conditions for wetlands and altitude to override in certain places.

- Ensure consistency like no forest in a tile that climate says desert just because soil is better – climate is king for the broad category.

- The resulting map we might visually inspect and adjust rules if something seems off (like too much savanna or too little, etc.) compared to expectation.

- Since the user asked for "beyond Whittaker diagram – how do soil, drainage, seasonality affect vegetation," our emphasis is exactly on those modifications.

Now, after Ecology stage, the planet generation is essentially complete: we have a living world map with its terrain, water, climate, and ecosystems all aligned causally.

One more requested part:

**Missing Systems Check:** We should reflect on any major Earth systems we omitted or simplified that could be important if higher fidelity was needed:

- **Cryosphere:** We included glaciers and sea ice somewhat. But if the simulation needed a separate cryosphere stage, it would involve dynamic ice sheet growth and feedback on sea level (glacial periods locking water). We did not explicitly simulate glacial advance/retreat over time beyond the static climate. If one wanted an ice age scenario, one might include a snapshot where ice sheets extend into mid-latitudes, and the resultant erosion and sea level change. Our pipeline considered cryospheric effects inside climate (albedo) and geomorphology (glacial erosion), but not a full dynamic cryosphere model. If extreme accuracy was needed, a cryosphere module could simulate ice sheet accumulation and melt, and adjust sea levels isostatically, but likely overkill for our purposes. We seem to have enough by treating it within climate.

- **Ice-Albedo Feedback:** We addressed that qualitatively (ensuring ice regions remain cold). If we were to iterate climate, that's one feedback we'd check (if too much ice, does it make world even colder etc., but we assume our setting of global temp inherently accounts for a balanced state).

- **Tides and Coastal Erosion:** Not handled explicitly. Could matter for detailing coast biomes (like tidal flats, mangroves which we mentioned, or the impact of tides on river deltas). For simplicity, we ignore tide dynamics, but note that extremely high tidal ranges (like Bay of Fundy) or tidal wetlands are a thing. Probably not critical at our scale.

- **Chemistry Cycles (Carbon, Nitrogen):** Not explicitly simulated. Carbon cycle would involve atmospheric CO₂ affecting climate, and biomes affecting CO₂ (forest uptake, ocean uptake). We somewhat handle CO₂ via the global temperature lever. If this were an Earth systems simulator, missing carbon feedback might be noted. But for our goal, that's probably beyond scope. Nitrogen or nutrient cycles similarly not simulated (we just assume soil fertility accounts for nutrients).

- **Ocean Biogeochemistry:** We didn't simulate currents effect on nutrient upwelling or marine ecosystems (like plankton blooms). If the game doesn't need marine biomes, that's fine. If it did (like fish resources clustering on rich fisheries), we might want to simulate upwelling zones (which often coincide with cold currents on west coasts of continents). We did mark cold currents; could infer fisheries from that. But it's a missing piece if marine life was to be considered.

- **Atmospheric composition & quality:** Not simulated (no distinction in air composition except moisture). Things like oxygen levels, or atmospheric pressure differences (maybe a thinner atmosphere would change climate patterns, but we assume Earth-like atmospheric mass).

- **Plate Tectonic Long-Term Climate Feedback:** Over tens of millions of years, plate movements alter ocean currents and mountain ranges, which alter climate. Our snapshots approach somewhat handles that by letting us reposition continents and then computing new climate equilibrium. But we did not simulate something like volcanic outgassing affecting climate or mountain uplift gradually causing cooling (as in Himalayas affecting monsoons). We treat plate movement as done by the time we do climate.

- **Vegetation-Clime feedback:** E.g., forests increase rainfall via transpiration sometimes. We didn't loop that back, which is acceptable at this scale.

- **Anthropogenic effects:** None, since presumably this is pre-civilization world. If one wanted to simulate an alternate scenario (like a world with a sentient species terraforming), that's separate.

- **Magnetic field / Radiation:** Not considered; relevant if we cared about habitability beyond climate (not needed for map gen).

- **Microclimates:** We largely operate at the tile scale (our tiles are maybe 100-300 km across on large map). Within-tile variation (like a valley oasis in a desert tile, or a small patch of forest along a river in a prairie tile) is below resolution. That's fine for strategy scale. If needed, one could downscale for local detail (that might be an in-game function when zooming or something).

- **Time Evolution / Multiple Snapshots beyond geology:** We decided climate snapshot is static. Real Earth has glacial cycles etc. We might say it's an average present-day-like climate. If a design wanted to include alternate climate eras (like a dried-up future or an ice age past), they could run climate stage with different parameters.

- **Albedo from vegetation and dust feedbacks:** Minor, but e.g. large deserts can increase albedo causing cooling and monsoon suppression. We did not simulate such couplings explicitly. However, if our climate ended up with huge deserts, we might manually check that climate is self-consistent. Usually, climate models consider dust from deserts and less rainfall beyond, etc., but that's beyond our static approach.

- **Sea level rise feedback on climate:** If climate warmed and melted ice, sea level would rise which changes coastline, which changes climate (more ocean area yields slightly different patterns). We are not doing multi-step interplay; we pick a sea level and climate consistent with it (implicitly Earth-like).

- **Human or Alien Life Influence:** Not relevant in generation, but if asking missing, perhaps "anthropogenic biome" (like cities, farmland) – but that is post-generation (players will add those).

- **Cryosphere Specific:** Perhaps the only thing is we might highlight that while we integrated cryosphere effects, we didn't have a separate stage for it. If needed, one could isolate a Cryosphere stage focusing on ice sheet spread and permafrost extent after climate, adjusting sea level or carving certain landforms (glacial deposition like moraines, drumlins, which we didn't explicitly simulate).

- **Albedo feedback loops** we addressed qualitatively, not iterative.

In summary, our model covers the major systems: tectonics, geomorphology, ocean, atmosphere, hydrology, soil, ecology. We decided to fold cryosphere into climate and geomorphology rather than separate. That seems appropriate given the modular approach and the fact cryosphere doesn't need as much separate logic beyond what climate does (except if we wanted to simulate ice age cycles, which we don't in continuous fashion).

Now I'll compose the **Missing Systems** section succinctly to finalize.

**Missing Systems & Feedback Loops:** Our modular pipeline covers most major Earth systems, but a few aspects were integrated simplistically or omitted, which could be expanded if greater realism is desired:

**Cryosphere Dynamics:** We included snow and ice effects within climate and geomorphology (glacial erosion, high albedo cooling) but did not create a separate "Cryosphere" stage. In reality, ice sheets grow and melt over millennia, altering sea levels and climate. In our model, ice extent is static (based on chosen climate). If one wanted to simulate an Ice Age or rapid deglaciation scenario, a dedicated cryosphere module could be introduced to iterate ice growth and melt and adjust the sea level and climate accordingly. For our scope, treating it as part of climate is sufficient; polar and glacial regions are handled by keeping those areas highly reflective and cold. We assume a stable climate snapshot where ice-albedo feedback is already accounted for in the global temperature balance (we don't dynamically simulate the feedback loop beyond ensuring ice-covered tiles remain cold). Thus, a "missing piece" could be a time-stepping ice sheet simulation if geological epochs of glaciation were of interest – but given that we aren't doing full temporal evolution, we judged it unnecessary.

**Carbon Cycle & Atmospheric Composition:** We have not modeled the carbon cycle or greenhouse gas variations explicitly. The global temperature lever stands in for the net effect of greenhouse gases, but we don't simulate, for example, how extensive forests sequestering carbon might cool climate over eons or how volcanic CO₂ might warm it. Our climate is essentially a fixed input. In an Earth simulation, carbon cycle feedbacks (e.g. warming causing permafrost methane release, which causes more warming) are important, but in a game context this level of complexity isn't needed unless a gameplay mechanic deals with climate change. We assume an Earth-like steady state atmosphere (similar to pre-industrial conditions). If needed, one could incorporate a simple carbon model to see, say, how much carbon is locked in peat vs forests vs atmosphere, but currently it's omitted as it doesn't affect map generation.

**Ocean Biochemistry and Currents Detail:** We created a believable pattern of ocean currents and SSTs, but we did not explicitly simulate phenomena like El Niño, upwelling nutrient currents, or marine ecosystems. If the game required placing fish resources or differentiating productive fishing zones, we might be missing a layer to identify nutrient-rich waters (often along cold upwelling currents on west coasts). We did implicitly mark cold currents, which could correlate with fish abundance, but no separate Ocean Ecosystem stage was done. Also, tides were ignored – we didn't simulate tidal ranges that could create tidal flats or influence river estuaries. These are fine details usually unnecessary at our scale (tiles ~100 km). For completeness: a separate module could simulate basic ocean nutrient cycles and perhaps identify coral reef zones (warm shallow clear waters) vs. dead zones, but again, that's likely beyond the scope of terrestrial map generation.

**Dynamic Feedbacks & Iteration:** Our pipeline is largely one-way: each stage feeds the next. In reality, some processes feedback into others (vegetation can influence climate, soil development can influence topography via erosion rates, etc.). We handled many of these in a single pass qualitatively. For example, we considered vegetation's effect on albedo (snow vs forest) in the climate design, but we didn't iterate climate again after setting biomes. In truth, if a large area ended up as bright desert instead of dark forest, it might alter regional climate slightly (deserts reflect more, potentially cooling the region). Our climate model already expected deserts where they formed, so it's self-consistent to first order. If one were pursuing maximum realism, one might iterate between climate and ecology a couple times to let vegetation distribution refine climate (a coupled atmosphere-biosphere model). We judged that unnecessary complexity – we assume the first-order climate drivers (latitude, oceans, mountains) dominate, and any vegetation feedback is minor enough to fold into the overall parameter choices.

**Human Impact & Land Use:** We explicitly did not simulate human activities like deforestation, agriculture, or urban heat islands. We generated a "natural" Earth-like planet. In a game like Civilization, human changes come into play during gameplay, not world generation. However, if one wanted scenarios such as a pre-generated world with ancient civilizations and farmland, a further stage could overlay anthropogenic biomes (cities, croplands, pasture). That is beyond our scope here but worth noting as an omitted layer.

**Internal Water Cycling and Groundwater:** While we touched on groundwater conceptually (in hydrology and soil moisture), we didn't simulate aquifer recharge, deep groundwater flow, or springs. If fine hydrological detail were needed (e.g., to decide where oasis springs appear in deserts, or which rivers are perennial vs seasonal), we might be missing a groundwater model. We treated river flow as constant based on annual averages, implicitly assuming groundwater provides baseflow where climate is seasonal. For our purposes (placing lakes, rivers, biomes) this is adequate. A full hydrogeology simulation was deemed too fine-scale.

**Chemical Weathering & Nutrient Feedback:** We created soil properties mostly from parent material and climate. We did not simulate chemical weathering rates explicitly beyond that. In reality, chemical weathering of silicate rocks ties into CO₂ drawdown (a long-term climate feedback) and releases nutrients that ecosystems need. We assumed a steady state where soils had reached an equilibrium given climate and time. No dynamic soil chemistry or nutrient depletion/replenishment cycles were simulated. That's acceptable since we just need the end-state fertility. Fertility itself we treated as static – we don't simulate how farming might deplete it, etc.

**Magnetic Field, Solar Radiation, and Other Planetary Factors:** We have taken Earth-like defaults (solar radiation, day length, atmospheric pressure). We didn't model UV levels, cosmic rays, or magnetic field (which could matter for radiation shield but not directly for map generation). If one wanted to explore, say, a planet around a different star, additional adjustments would be needed (different spectral distribution might affect plant type – red sun could mean different vegetation color, etc.). That's beyond our Earth-physics scope. We assume a Sun-like star and Earth's general atmospheric makeup, so these aspects weren't explicitly parameterized in our pipeline.

**Microclimates and Small-Scale Variation:** Because our resolution is limited (120×80 max grid), a lot of microclimate effects are effectively averaged out. For example, a valley might be wetter than an adjacent hill ("rain shadow" on a very local scale) or a coastal zone might have fog that inland just a few kilometers doesn't. Our climate and biome assignment are tile-based, so they can't capture microclimates smaller than a tile. This is a conscious simplification. It means features like a green river valley through a desert (except perhaps one tile wide for the Nile) or a coastal fog desert (like Namibia's narrow fog belt) might not appear distinctly. We accept this loss of detail. If needed, one could downscale the climate results stochastically to generate sub-tile variation for rendering or scenario purposes.

In conclusion, the pipeline covers the essential systems for an Earth-like world and their causal linkages. We prioritized large-scale consistency (mountains cause rain shadows, ocean currents warm coasts, etc.). The most significant omissions (like not iterating climate-vegetation feedback or not separately modeling the ice age cycles) are unlikely to break plausibility for a single, roughly modern-era snapshot of climate. They were conscious simplifications to keep the model computationally feasible and conceptually clear. The design is modular enough that if a later decision is made to incorporate, say, a dynamic ice age toggle or a carbon-cycle-based climate adjustment, we could slot that in (for example, a Cryosphere stage between climate and hydrology to recalc sea level for an ice age scenario, or a slight recalculation of climate after ecology for refinement).

Overall, our architecture provides a detailed, multi-layered Earth simulation suitable for game world generation, with the above limitations being either negligible in effect or adjustable via parameters. The world should **feel** coherent and realistic to players, obeying the "rules" of geology and climate, which was our primary goal. We've struck a balance between scientific rigor and practical simplification, ensuring that every major feature (mountains, deserts, rivers, etc.) has an explanation rooted in our model's physics. Where we simplified (e.g., folding cryosphere into climate), we did so knowingly, preserving the intuitive cause-effect relationships that make the world believable.

## References

- Around The World, Part 3: Hotspots and erosion: Frozen Fractal. https://frozenfractal.com/blog/2023/11/20/around-the-world-3-hotspots-erosion/
- How Wind And Water Create The World's Most Beautiful Rock Landscapes. https://gizmodo.com/how-wind-and-water-create-the-worlds-most-beautiful-roc-1550763072
- Volcanoes: Principal Types of Volcanoes. https://pubs.usgs.gov/gip/volc/types.html
- River Delta: How It Forms - Earth How. https://earthhow.com/river-delta/
- Orographic Lifting and Rain Shadows | Repetitio. https://repetitio.ai/subjects/geography/weather-systems/orographic-lifting-and-rain-shadows/
- Thermohaline Circulation - Currents: NOAA's National Ocean Service Education. https://oceanservice.noaa.gov/education/tutorial_currents/05conveyor1.html
- Coriolis Effect and Atmospheric Circulation. https://education.nationalgeographic.org/resource/coriolis-effect-and-atmospheric-circulation/
- What Is a Monsoon? | NESDIS | National Environmental Satellite, Data, and Information Service. https://www.nesdis.noaa.gov/about/k-12-education/severe-weather/what-monsoon
- Climate feedbacks-The connectivity of the positive ice/snow albedo feedback, terrestrial snow and vegetation feedbacks and the negative cloud/radiation feedback | GRID-Arendal. https://www.grida.no/resources/5261
- Soil formation - Soils 4 Teachers. https://www.soils4teachers.org/formation
- Endorheic basin - Wikipedia. https://en.wikipedia.org/wiki/Endorheic_basin
- Delta. https://education.nationalgeographic.org/resource/delta/
- Five factors of soil formation - University of Minnesota Extension. https://extension.umn.edu/soil-management-and-health/five-factors-soil-formation
- Coal - Wikipedia. https://en.wikipedia.org/wiki/Coal
- Petroleum. https://education.nationalgeographic.org/resource/petroleum/
- Banded Iron Formation | AMNH. https://www.amnh.org/exhibitions/permanent/planet-earth/how-has-the-earth-evolved/banded-iron-formation
