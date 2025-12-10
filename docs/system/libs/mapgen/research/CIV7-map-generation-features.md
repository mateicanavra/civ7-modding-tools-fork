# Architectural Geomorphology: A Physics-Based Implementation Strategy for Civilization VII Map Generation

## 1. Executive Summary: The Voronoi Paradigm Shift

The procedural generation of virtual worlds within the 4X strategy genre has historically relied upon fractal noise algorithms—specifically Perlin or Simplex noise—to synthesize terrain. While effective for creating coherent heightmaps, these methods lack the structural intentionality required to simulate realistic tectonic processes or enforce complex gameplay constraints. The release of Civilization VII marks a definitive architectural departure from this legacy approach, introducing a map generation engine founded upon Voronoi diagrams. This shift is not merely an aesthetic choice but a foundational engineering response to the game’s new *Ages* mechanic, which necessitates a world that can expand dynamically, separate distinct “Homelands” from “Distant Lands,” and support high-fidelity hydrological systems like Navigable Rivers.

This report provides an exhaustive technical analysis of the Civilization VII map generation pipeline. By deconstructing the developer’s use of Voronoi tessellation and mapping these mechanics to physics-based geological concepts—such as plate tectonics, subduction zones, and atmospheric circulation—we derive a comprehensive Game-Logic Implementation Plan. This plan details how the engine simulates a living world that evolves geologically and strategically from Antiquity to the Modern Age, ensuring that every mountain range, river valley, and resource deposit exists as a logical consequence of simulated physical forces rather than random noise.

The analysis synthesizes data regarding the new “Rough” terrain classification, the decoupling of strategic resources from unit production, and the intricate *Succession* logic where map features transmute across Ages. The resulting document serves as a blueprint for understanding the complex interplay between geological simulation and game design in the next generation of strategy gaming.

## 2. Computational Tectonics: The Voronoi Foundation

The fundamental substrate of the Civilization VII map generator is the Voronoi diagram. Unlike fractal noise, which generates terrain based on frequency and amplitude irrespective of structure, Voronoi diagrams partition space into regions (cells) based on the distance to a specific set of seed points. This mathematical structure provides the “bones” upon which tectonic rules are imposed, creating a discrete cellular automaton capable of simulating continental drift and crustal interaction.

### 2.1. The Voronoi Architecture and Tectonic Simulation

The generation pipeline initiates with a low-resolution “spray” of points, creating a primal graph of cells. In the context of the game's physics simulation, these cells function as the atomic units of the lithosphere. This discretization of space allows for a deterministic application of geological rules that was previously impossible with continuous noise functions.

#### 2.1.1. Cell Seeding and Plate Nucleation

The algorithm selects specific cells to act as “seeds” for tectonic plates. This mirrors the geological process of craton formation, where ancient, stable rock cores form the nucleus of continents. The implementation likely utilizes a Poisson Disk Sampling method to distribute these seeds, ensuring an organic yet uniform distribution that prevents the unnatural clustering characteristic of pure random placement. From these seeds, the algorithm expands outward, aggregating adjacent Voronoi cells into larger “Plate” objects. This aggregation is governed by configurable rules, likely weighted by desired plate size and shape anisotropy—elongated plates for island arcs versus circular plates for massive continental cratons.

Each resulting plate is assigned a movement vector (direction) and a rotation parameter. This simulates plate tectonics, where the interaction between plates—convergence, divergence, and transform motion—dictates the topography. By assigning velocity and direction vectors to these cellular clusters, the engine can mathematically predict where stress accumulates, effectively simulating the geological forces that raise mountains or open rifts.

#### 2.1.2. The Dual-Layer Resolution Technique

A critical innovation in Civilization VII is the dual-pass resolution approach. The initial pass defines the macro-tectonics—the plates, continents, and oceans. Once the tectonic foundation is solidified, a second “spray” of much denser points is applied over the established map. These high-resolution cells inherit the tectonic properties of the underlying parent plate but allow for high-frequency detail. This “shattered glass” aesthetic allows the engine to erode coastlines, create jagged mountain ranges, and carve river valleys with a granularity that matches the hex grid.

### 2.2. Plate Interaction and Topographic Logic

The interaction between the assigned vectors of adjacent plates drives the generation of major terrain features. This physics-based approach ensures that mountains and oceans appear in geologically plausible locations rather than being scattered randomly.

#### 2.2.1. Convergent Boundaries: Orogeny and Volcanism

When two plates possessing converging vectors intersect, the simulation triggers an orogenic event. If both plates are designated as “Continental” crust, the collision results in significant uplift, generating “Mountainous” terrain cells along the boundary line. This mimics the formation of the Himalayas. If one plate is “Oceanic” (denser) and the other “Continental” (buoyant), the simulation mimics subduction. The oceanic plate is forced beneath the continental plate, generating a trench in the ocean cells and a volcanic arc on the continental margin. In game logic, this translates to a linear arrangement of “Volcano” features and “Rough” terrain (hills) running parallel to the coast.

#### 2.2.2. Divergent Boundaries: Rifts and Atolls

Where plate vectors diverge, the engine simulates crustal thinning. On continental plates, this results in “Rift Valleys”—linear sequences of low-lying Flat terrain, potentially filled by Lakes or Minor Rivers, simulating structures like the East African Rift. In oceanic contexts, divergence creates Mid-Ocean Ridges. While the ridge itself might be deep water, the game logic uses these zones to spawn small island chains or “Atolls” in the Deep Ocean, creating strategic naval chokepoints and resource zones.

### 2.3. The “Distant Lands” Constraint

A unique requirement of Civilization VII is the enforced separation between “Homelands” (where players spawn) and “Distant Lands” (accessible only in the Exploration Age). The Voronoi system is explicitly used to steer this generation. The generator identifies the boundary between the “Homeland” plate and the “Distant Land” plate and enforces a “Deep Ocean” biome tag on the cells separating them. This ensures no coastal bridge exists that would allow early traversal, strictly enforcing the technological gate of the Exploration Age.

## 3. Topographic Verticality: Physics and Gameplay Mechanics

Civilization VII introduces a significant leap in verticality, moving beyond the binary “Hill/Flat” distinction of previous titles to a more nuanced elevation model that includes “Rough” terrain, inland cliffs, and multi-tile elevation gradients. This system is designed to impact visibility, movement costs, and combat mechanics, simulating the tactical reality of varied terrain.

### 3.1. The New Elevation Taxonomy

The terrain system has been reclassified to support the visual and mechanical representation of height.

- **Flat Terrain:** The baseline elevation (0). This represents alluvial plains, basins, and lowlands.
- **Rough Terrain:** Replaces the generic “Hills.” Represents elevation (1), including foothills, rocky outcrops, and uneven ground. Mechanically, this imposes movement penalties and offers defensive bonuses.
- **Mountainous Terrain:** The highest elevation (2+). Generally impassable to land units without specific traits or tech.
- **Cliffs:** Explicit boundaries between elevation levels. Unlike Civ VI, where cliffs were primarily coastal, Civ VII features inland cliffs that block movement between adjacent tiles of different elevations (e.g., moving from Flat to Rough across a cliff face is forbidden).

### 3.2. Physics-Based Cliff Generation Plan

To implement naturalistic cliffs, the map generator must analyze the gradient between adjacent Voronoi cells. If the elevation difference (ΔE) between Cell A and Cell B exceeds a specific threshold—indicative of steep uplift caused by a reverse fault or rapid erosion—a “Cliff” attribute is applied to the shared edge. Post-generation, an erosion pass smooths strictly vertical transitions into “Rough” slopes unless the underlying tectonic stress (compression) maintains the sheer face. This creates “plateaus” and “mesas,” features which have been visually confirmed in the game’s diverse biomes.

### 3.3. Tactical Implications of Verticality

The verticality system interacts directly with the combat and movement engines. Units on Rough terrain or Plateaus possess superior Line of Sight (LOS), allowing them to see over Flat terrain obstacles such as forests or jungles. Inland cliffs create natural choke points, forcing armies to funnel through “ramps” or passes, effectively simulating the strategic reality of mountain warfare (e.g., Thermopylae). Furthermore, where a river flows over a cliff edge (transition from Elevation 1 to 0), a Waterfall feature is generated. This blocks naval movement and provides unique adjacency bonuses to Appeal and Happiness, incentivizing settlement near these aesthetically pleasing but logistically challenging features.

## 4. Hydrological Simulation: The River Systems

Hydrology in Civilization VII has been overhauled to include Navigable Rivers, a feature that fundamentally alters city placement, trade, and warfare. The game distinguishes between minor streams and major arteries, necessitating a generation algorithm based on flow accumulation and drainage basins.

### 4.1. Navigable vs. Minor Rivers

The game utilizes a bifurcated classification for flowing water, each with distinct generation logic and gameplay rules.

- **Minor Rivers:** Flow between hex edges (hex-side). These function identically to rivers in previous games, providing fresh water, imposing minor defense penalties for crossing, and strictly prohibiting naval traversal.
- **Navigable Rivers:** Flow through the center of the hex. These are treated as “Water” tiles (specifically distinct from Marine/Coastal), allowing Naval Units to traverse them and requiring Land Units to embark. They essentially function as inland extensions of the coast.

### 4.2. Generation Algorithm: Flow Accumulation

To determine which rivers become Navigable, the generator likely employs a Flow Accumulation Model based on the generated heightmap.

1. **Drainage Basin Definition:** The Voronoi cells define the local gradient. Rain falls on tiles (determined by the climate model) and flows to the lowest adjacent neighbor.
2. **Accumulation Buffer:** As “water” flows downhill, it accumulates a volume value based on the formula:
   \( V_{total} = V_{local\_rainfall} + \sum V_{upstream\_neighbors} \).
3. **Thresholding Logic:**
   - If \( V_{total} < Threshold_{Nav} \), the flow is rendered as a Minor River on the tile edge.
   - If \( V_{total} \ge Threshold_{Nav} \), the flow “breaches” the hex, occupying the center and transforming the tile into a Navigable River terrain type. This typically occurs in the lower reaches of the drainage basin where tributaries merge.

### 4.3. The Physics of River Morphology

The Navigable River system simulates real-world river maturation. In the upper course, rivers are fast and narrow (Minor). In the lower course, they become wide and meandering (Navigable). The Voronoi paths allow for organic meandering rather than the jagged 60-degree turns of hex-edge rivers observed in grid-only generation. These rivers create estuaries or deltas where they meet the sea, serving as critical trade hubs. Specific Civilizations, such as Egypt, possess bonuses tied explicitly to Navigable Rivers (e.g., +2 Food/Production on districts adjacent to them), making the identification and control of these hydrologic arteries a primary strategic objective.

## 5. Climatology and Biome Modeling

The skin of the world—the Biomes—is generated via a climate simulation that interacts with the tectonic and heightmap layers. Civilization VII introduces new classifications like “Tropical” distinct from “Vegetated,” and groups features into “Wet,” “Vegetated,” and “Rough” tags to facilitate gameplay bonuses.

### 5.1. The Climate Simulation Loop

The placement of Biomes is determined by three primary variables simulated across the Voronoi grid: Latitude, Wind Direction, and Hydrological Flux.

#### 5.1.1. Atmospheric Circulation

The simulation models a simplified version of the Hadley, Ferrel, and Polar cells. Latitude defines the base energy input:

- **Equatorial Zone (0°–23°):** High energy, ascending air masses causing high precipitation (Intertropical Convergence Zone). Result: Tropical Biomes.
- **Subtropical High (23°–35°):** Descending dry air. Result: Desert Biomes.
- **Temperate Zone (35°–60°):** Westerly winds carrying moisture. Result: Grassland/Plains.
- **Polar Zone (>60°):** Low energy. Result: Tundra/Snow.

#### 5.1.2. The Rain Shadow Effect

A crucial physics-based addition is the dynamic Rain Shadow. The simulation casts moisture vectors (simulating trade winds or westerlies) across the map. When these vectors intersect a “Mountainous” Voronoi cell, the moisture is deposited on the windward side, creating “Wet” or “Vegetated” terrain. The leeward side receives zero moisture, forcing the generation of arid “Desert” or “Plains” biomes regardless of latitude. This mechanic allows for the creation of high-altitude deserts (like the Atacama or Gobi) and validates the placement of resources like Niter, which require arid conditions.

### 5.2. Biome Taxonomy and Yield Logic

The game categorizes terrain into broader “Biomes” which then contain specific “Features.” The distinction between “Tropical” and “Grassland” is vital for gameplay balance, as certain civilizations (e.g., Maya, Vietnam) have bonuses tied specifically to Tropical vegetation rather than temperate woods.

| Biome     | Climate Logic                | Features (Vegetated/Wet)         | Yield Profile (Antiquity)        |
|-----------|-----------------------------|----------------------------------|----------------------------------|
| Grassland  | Temperate, High Moisture     | Forest (Veg), Marsh (Wet)         | Food Dominant (+1 Food)           |
| Plains     | Temperate, Moderate Moisture | Savannah (Veg), Watering Hole (Wet) | Production Dominant (+1 Prod)     |
| Tropical   | Equatorial, High Moisture    | Rainforest (Veg), Mangrove (Wet)  | Hybrid (Food/Science/Prod)        |
| Desert     | Arid, Low Moisture            | Sagebrush (Veg), Oasis (Wet)      | Low Yield, High Adjacency (Gold)  |
| Tundra     | Polar, Low Temp               | Taiga (Veg), Bog (Wet)             | Low Yield, Resource Dense          |
| Marine     | Oceanic                       | Reef (Coastal), Ice (Polar)        | Food/Gold (Coastal), Blocked (Ocean) |

## 6. Resource Stratigraphy and Geologic Determinism

Civilization VII radically overhauls resources, decoupling them from direct unit production requirements (no longer “1 Iron = 1 Swordsman”) and categorizing them into Bonus, City, Empire, Treasure, and Factory resources. This section maps these resources to their geological formation conditions to create a placement logic for the map generator.

### 6.1. Resource Categories and Strategic Function

- **Bonus Resources:** Local yields (Food/Production). Examples: Cotton, Fish. These are movable between settlements to optimize city planning.
- **City Resources:** Specialization bonuses applied to specific cities (e.g., +15% Gold). Examples: Jade, Salt. These encourage city specialization (e.g., a “Gold City” vs. a “Science City”).
- **Empire Resources:** Global passive buffs that stack. Examples: Iron (+1 Combat Strength to Infantry), Horses (+1 Strength to Cavalry). This mechanic encourages broad expansion to accumulate stacking buffs rather than just securing a single strategic node.
- **Treasure Resources:** Exclusive to “Distant Lands” in the Exploration Age. Examples: Spices, Silver (Distant). These produce “Treasure Fleets” for economic victory points.

### 6.2. Geological Placement Logic: The Implementation Matrix

To generate a realistic distribution, the placement algorithm must query the Tectonic and Climate layers to determine valid spawn locations.

#### 6.2.1. Magmatic and Metamorphic Resources (Plate Boundary Dependent)

- **Jade:** Geologically formed in high-pressure/low-temperature subduction zones.
  *Game Logic:* Must spawn on Rough Terrain or Flat Terrain adjacent to Tectonic Plate collisions (Mountain ranges). In-game, it appears on Flat Tropical or Tundra tiles, abstracting the alluvial deposits of eroded metamorphic rock.

- **Gold/Silver:** Typically epithermal deposits associated with volcanic arcs and hydrothermal vents.
  *Game Logic:* High probability near Volcanoes, Mountains, or Geothermal Fissures. Often found in “Rough” terrain (Hills) or Deserts where erosion exposes veins.

- **Marble:** Metamorphosed limestone resulting from heat and pressure.
  *Game Logic:* Spawns in Grassland/Plains (former shallow seas) that have undergone tectonic stress (Rough terrain).

#### 6.2.2. Sedimentary and Evaporite Resources (Basin Dependent)

- **Salt:** An evaporite mineral formed in drying basins or ancient seabeds.
  *Game Logic:* Desert or Plains (Flat). High probability in “Rift Valley” depressions or near Salt Lakes.

- **Niter (Saltpeter):** Historically harvested from arid environments, caves, or organic decomposition in nitrogen-rich soils.
  *Game Logic:* Flat Terrain and Floodplains in all biomes. The game logic prioritizes floodplains to simulate the nutrient-rich soils where niter crystallizes and can be harvested.

- **Gypsum:** Evaporite mineral associated with sedimentary rock.
  *Game Logic:* Desert and Plains (Flat).

#### 6.2.3. Biological Resources (Climate Dependent)

- **Truffles:** Ectomycorrhizal fungi requiring specific tree hosts (Oak/Hazel) and alkaline soil.
  *Game Logic:* Must spawn in Vegetated tiles (Woods) within Grassland or Plains biomes. Strict latitude constraints ensure they only appear in temperate zones.

- **Cocoa/Coffee/Tea (Treasure):** Tropical agricultural products.
  *Game Logic:* Tropical biome (Rainforest). These are heavily weighted as “Treasure Resources” in Distant Lands to drive Exploration Age colonization.

### 6.3. Resource Succession: The Map as a Palimpsest

A critical “physics” feature of the map is Resource Succession. As the world ages from Antiquity to Exploration to Modern, the resource map is not static.

- **Succession Logic:** When transitioning Ages, the map script re-rolls specific tiles based on a pre-determined “Succession Table.”
  Example: A “Camels” resource (Antiquity) might deplete and be replaced by “Oil” (Modern) in the same Desert tile, representing the shift from biological utility to geological extraction.

- **Replacement Chains:** Salt → Niter; Iron → Coal. This mimics the historical discovery of new utility in existing geology.

- **Implementation:** The map data structure likely contains “Potential Layers” generated at Turn 0. A tile is not just “Desert”; it is “Desert (Active: Camels, Latent: Oil).” The Age Transition event triggers the toggle of these states.

## 7. Natural Wonder Generation: Anomalies and Placement

Natural Wonders in Civ VII are treated as unique geological anomalies that anchor the map's “Personality.” They are not merely distinct tiles but “Super-Seeds” in the Voronoi generation that deform the surrounding terrain.

### 7.1. Wonder Types and Effects

- **Tectonic/Volcanic Wonders (e.g., Mount Kilimanjaro / Thera):** Volcanic, eruptive features.
  *Effect:* Provide fertility/production bonuses but pose risks of damage to improvements.
  *Placement:* Strictly tied to Tectonic plate boundaries or Hotspots.

- **Hydrological/Erosional Wonders (e.g., Grand Canyon):** Massive erosion features.
  *Effect:* Provides Science on Flat tiles.
  *Placement:* Must intersect a River vector; likely generated in Arid/Plains regions where erosion is visually distinct.

- **Waterfall Wonders (e.g., Gullfoss / Iguazu Falls):**
  *Effect:* Provide massive Food/Production bonuses.
  *Placement:* Generated at river transitions over elevation cliffs (Elevation 1 → 0).

- **Ecological Wonders (e.g., Great Barrier Reef):** Marine biological anomalies.
  *Effect:* Boosts Science and Food in adjacent marine tiles.
  *Placement:* Coastal/Marine tiles in warm latitudes (Tropical/Subtropical).

### 7.2. Spawn Logic: The “Wonder Budget”

The map script allocates a “Wonder Budget” based on map size (e.g., Standard Map = 5 Wonders).

- **The Voronoi Interaction:** Wonders act as constraints in terrain generation. A cell designated for a Wonder (e.g., Grand Canyon) forces the surrounding terrain to conform—flattening surrounding tiles to maximize the Science bonus from the canyon or raising hills around a mountain wonder to create an impassable barrier.

- **Isabella’s Bias:** The leader Isabella has a specific bias to spawn near Natural Wonders. The generator must check player selection before finalizing Wonder locations to ensure a valid starting plot exists near a Wonder if she is in play, modifying the seed distribution if necessary.

## 8. Temporal Map Expansion: The Age System

Civilization VII introduces the concept of the expanding map, where the playable area grows with each Age (Antiquity → Exploration → Modern). This requires a sophisticated handling of “Fog of War” and map boundaries, moving beyond simple visual obstruction to physical inaccessibility.

### 8.1. The Expanding Boundary Mechanic

- **Antiquity:** The map generator restricts the camera and unit movement to the “Homeland” continent. The “Distant Lands” are generated but masked (or treated as “Terra Incognita”). The Voronoi generation ensures a “Deep Ocean” buffer separates these zones, preventing early crossing.

- **Exploration:** The “Deep Ocean” penalty is mitigated (via Tech like Cartography), and the mask is lifted. The generator ensures that Treasure Resources (Spices, Gold) are exclusively placed in these newly accessible zones to incentivize expansion and trade.

- **Modern:** The entire map is accessible. Resources like Oil and Uranium, previously hidden or irrelevant, are revealed in both Homeland and Distant territories.

### 8.2. Legacy Persistence vs. Reset

The map is a palimpsest—history is written in layers.

- **Persistent Features:** Terrain, Natural Wonders, and “Ageless” buildings (World Wonders) remain across Age transitions.
- **Transient Features:** Antiquity buildings lose adjacency bonuses, requiring urban renewal. Navigable Rivers may change utility (e.g., becoming less critical for defense but more vital for industrial trade).

**Implementation Note:** The map data structure must maintain separate “layers” for Age-specific attributes. For example, a tile might be designated as a “Farm” in Antiquity but rezoned for “Subdivision” in the Modern Age. This requires the map script to track state persistence for every tile, ensuring that the “evolved” map retains the geographic identity of the previous Age while offering new strategic puzzles.

## 9. The “Distant Lands” and Global Topology

A central pillar of the Exploration Age is the “Distant Lands”—continents or islands that are geographically separated from the player's start location. The implementation of this feature relies on graph theory and Voronoi partitioning to ensure connectivity rules are met.

### 9.1. Graph Theory for Continent Separation

The map generator treats tectonic plates as nodes in a graph.

- **Homeland Cluster:** A subgraph of connected plates where players spawn.
- **Distant Cluster:** A separate subgraph of plates.
- **Separation Condition:** The edges connecting the Homeland Cluster to the Distant Cluster must be “Oceanic” and sufficiently wide (Deep Ocean) to prevent coastal traversal. The Voronoi generator enforces this by flagging boundary cells between clusters as “Deep Ocean” regardless of the local noise values.

### 9.2. Treasure Fleet Logic

The economy of the Exploration Age depends on “Treasure Fleets,” which transport goods from Distant Lands.

- **Spawn Logic:** Treasure Resources (e.g., Spices, Silver) are generated only in the Distant Cluster.
- **Topological Requirement:** These resources must be placed on coastal tiles or near Navigable Rivers within the Distant Lands. If a Treasure resource spawns landlocked in the center of a massive Distant continent, it is mechanically useless until rail is unlocked. Therefore, the generator biases Treasure placement toward the coasts of the Distant Lands to facilitate the Treasure Fleet mechanic.

## 10. Technical Implementation Strategy

Based on the physics-based analysis, the following outlines the proposed procedural generation pipeline for Civilization VII.

### Phase 1: Tectonic Initialization (Voronoi)

1. **Seed Generation:** Generate \( N \) points using Poisson Disk Sampling.
2. **Lloyd's Relaxation:** Apply Lloyd's algorithm to regularize cell shapes, preventing slivers and ensuring playable tile shapes.
3. **Plate Aggregation:** Group cells into \( P \) tectonic plates. Assign vectors \( \vec{v} \) (movement) and \( \theta \) (rotation).
4. **Boundary Resolution:**
   - If \( \vec{v}_A \cdot \vec{v}_B < 0 \) (Converging): Mark boundary as Mountain/Volcano.
   - If \( \vec{v}_A \cdot \vec{v}_B > 0 \) (Diverging): Mark boundary as Rift/Ocean.

### Phase 2: Hydrology and Erosion

1. **Heightmap Generation:** Apply height values based on Plate Boundaries.
2. **Flow Simulation:** Run rain-flow simulation. Calculate Accumulation \( Acc \).
3. **River Classification:**
   - Edges with \( Acc > T_{minor} \) = Minor River.
   - Cells with \( Acc > T_{nav} \) = Navigable River (Transform Tile Type).
4. **Erosion:** Erode cliffs where \( Acc \) is high (water cutting through rock), creating waterfalls at remaining cliffs.

### Phase 3: Biome and Climate Painting

1. **Temperature/Moisture Grid:** Calculate based on Latitude and Wind Vectors.
2. **Rain Shadow Raycast:** Cast wind rays; if a ray hits a Mountain, reduce moisture for subsequent tiles (Leeward).
3. **Biome Assignment:** Map {Temp, Moisture} tuples to the Biome Table (e.g., {High T, Low M} = Desert).

### Phase 4: Stratigraphic Resource Population

1. **Pass 1 (Base):** Place Bonus Resources (Food/Prod) to ensure start viability.
2. **Pass 2 (Geologic):** Query Tectonic Map. Place Iron/Gold/Jade near Mountains/Faults.
3. **Pass 3 (Distant Lands):** Identify “Distant” plates. Flood with Treasure Resources (Sugar, Spices).
4. **Pass 4 (Succession Seeds):** Pre-calculate Modern resources (Oil, Uranium) but flag as “Hidden.”

### Phase 5: Age-Gating and Rendering

1. **Homeland Identification:** Select spawn continent.
2. **Ocean Buffer Enforcement:** Verify Navigability connectivity graph. Ensure no shallow path exists to Distant Lands.
3. **Render:** Output hex grid with overlaid Voronoi aesthetic (Dual-Layer visual).

| Boundary Type    | Vector Interaction               | Resulting Terrain              | Resource Probability                     |
|------------------|----------------------------------|---------------------------------|------------------------------------------|
| Convergent       | \( \vec{v}_1 \cdot \vec{v}_2 < -0.5 \) | Mountainous, Volcanoes         | Jade, Iron, Gold (High)                  |
| Transform        | \( -0.5 \le \vec{v}_1 \cdot \vec{v}_2 \le 0.5 \) | Rough (Hills), Earthquakes | Stone, Marble                            |
| Divergent        | \( \vec{v}_1 \cdot \vec{v}_2 > 0.5 \)  | Rift Valley (Flat/Lakes)      | Salt, Gypsum, Geothermal                 |
| Oceanic Rift     | Diverging Oceanic Plates           | Atolls, Island Chains           | Pearls, Whales (Marine)                  |

| Resource | Game Category | Biome Requirement            | Geologic Origin (Real World) | Game Abstraction Logic                           |
|----------|----------------|-----------------------------|-----------------------------|--------------------------------------------------|
| Jade     | City (Gold)    | Tropical/Tundra (Flat)       | High-Pressure Metamorphism  | Placed in “exotic” biomes to force trade/expansion. |
| Niter    | Empire         | Floodplains/Flat (All)       | Arid Caves / Organic Soil    | Associated with nutrient-rich, flat agricultural lands. |
| Iron     | Empire         | Rough/Tundra                 | Banded Iron Formations       | Tied to ancient rock (Rough) and desolate zones (Tundra). |
| Truffles | City (Prod)    | Vegetated (Grass/Plains)     | Ectomycorrhizal (Forest Roots) | Strictly tied to Woods/Vegetation features.        |
| Gold     | Empire         | Desert/Plains (Rough)        | Hydrothermal Veins           | Tied to rough/arid terrain (Gold Rush aesthetic). |
| Spices   | Treasure       | Distant Lands (Tropical)      | Tropical Agriculture         | Exclusive to “New World” plates to drive Exploration. |

| River Type | Flow Volume (\( V \))        | Hex Position | Traversal Rules                        | Adjacency Effects                    |
|------------|------------------------------|--------------|----------------------------------------|-------------------------------------|
| Minor      | \( V < T_{nav} \)            | Hex-Edge     | Land: Penalty; Naval: Blocked          | Fresh Water, Defense +              |
| Navigable  | \( V \ge T_{nav} \)           | Hex-Center   | Land: Embark; Naval: Move               | Fresh Water++, Trade Route Range+  |
| Waterfall  | Any (Cliff Transition)       | Cliff Edge   | Blocked (All)                          | Appeal++, Happiness++               |

## 11. Conclusion

The map generation system of Civilization VII represents a sophisticated convergence of computational geometry and geological simulation. By discarding the isotropic randomness of fractal noise for the structured, vector-based logic of plate tectonics, the engine achieves a world that is not only visually distinct but strategically legible. The alignment of resources with their geological origins, the physical simulation of river hydrology, and the enforced tectonic separation of “Ages” creates a gameplay loop where the map itself is a puzzle to be solved—not just a board to be conquered. The implementation plan outlined above ensures that this complexity remains performant while delivering the “History in Layers” experience central to the game's design philosophy.
