# Architectural Review and Geophysical Simulation Strategy for the MapGen Plugin: The Foundation Phase

## 1. Introduction: The Paradigm Shift to Physics-Based World Generation

The transition from noise-based procedural generation to physics-driven simulation represents a fundamental evolution in the strategy game genre. Traditional map generation—relying largely on coherent noise functions such as Perlin or Simplex noise masked by biome lookup tables—produces terrain that is aesthetically plausible but geologically incoherent. In such systems, a mountain is merely a high value in a heightmap, devoid of causal history or structural context. For the **MapGen plugin**, the stated objective of building a *“physics-driven map generation engine”* necessitates a rigorous departure from these methods. It requires the implementation of a system where terrain is not painted, but emerges as a consequence of deep-time geological processes.

The “Foundation” phase, as outlined in the **`foundation.md` design proposal**, serves as the lithospheric engine of this pipeline. Its responsibility is to establish the boundary conditions and driving forces that will ultimately dictate the distribution of every subsequent game element, from the strategic placement of mountain passes to the economic distribution of mineral resources. To validate this design, we must first re-anchor our understanding of tectonic physics, moving away from abstract game concepts and toward a simplified yet faithful representation of geodynamics.

This report provides an exhaustive analysis of the Foundation phase. It evaluates the current design against the requirements of high-fidelity geological simulation, identifying critical gaps in realism, data structure, and temporal evolution. By synthesizing domain knowledge from geophysics, petrology, and computational modeling, this document outlines a roadmap for evolving the Foundation phase from a static map generator into a dynamic planetary history simulator capable of supporting the *“very old world”* scenarios envisioned for the mod.

## 2. Re-Anchoring in Tectonic Physics: A Geodynamic Framework

To create a Civilization-style game world that feels authentic, the Foundation phase must simulate the underlying physical engines of the planet, not just the surface symptoms. The current design document references *“forces on plates,”* but in a physics-based model, these forces are derivative of the fundamental relationship between the planet’s thermal interior and its rigid exterior.

### 2.1 The Rheological Stratification: Lithosphere vs. Asthenosphere

A critical distinction often missed in procedural generation is the difference between *“crust”* and *“plate.”* In geological terms, a tectonic plate is defined by its mechanical rigidity, or rheology, rather than its chemical composition. The plate is the Lithosphere, a rigid thermal boundary layer that includes both the crust and the uppermost, brittle mantle. This rigid shell “floats” atop the Asthenosphere, a hotter, ductile region of the mantle capable of slow, fluid-like flow over geological timescales.¹

For the **MapGen** Foundation phase, this distinction is paramount. The simulation cannot simply model 2D polygons moving on a grid; it must model the coupling between the rigid lithosphere and the fluid asthenosphere. The motion of plates is not random; it is driven by the heat exchange between these layers. The asthenosphere is denser than the continental lithosphere but less dense than old, cold oceanic lithosphere. This density contrast is the primary driver of plate tectonics.²

Consequently, the Foundation phase must assign rheological properties to every cell or node in the mesh:

- **Density (ρ):** The mass per unit volume. Continental crust typically averages 2.7 g/cm³, while oceanic crust averages 3.0 g/cm³.³
- **Thickness (h):** The vertical extent of the lithosphere.
- **Temperature (T):** Which governs the density of oceanic plates (cooling leads to densification).

By modeling these properties, the simulation can utilize the principle of Isostasy to determine elevation. Isostasy dictates that the lithosphere floats on the asthenosphere such that the total mass of the column is in equilibrium. High-elevation features like the Himalayas are supported by deep crustal “roots” that displace the denser mantle material below, much like an iceberg.⁴ If the Foundation phase relies on noise to set elevation, it creates a disconnect where erosion (removing mass) does not lead to isostatic rebound (uplift). In a physics-driven model, elevation \(E\) should be a derived value:

\[
E = H_{\text{crust}} \times \frac{\rho_{\text{mantle}} - \rho_{\text{crust}}}{\rho_{\text{mantle}}} - H_{\text{sea\_level}}
\]

This formulation ensures that *“land”* and *“ocean”* are emergent properties of crustal density and thickness, rather than arbitrary classifications assigned to polygons.³

### 2.2 The Driving Forces of Plate Motion

The architecture document mentions modeling forces on plates. In a realistic simulation, these forces are specific and quantifiable. They are not merely abstract vectors but are the result of gravitational instability. The three primary forces that must be parameterized in the Foundation phase are Slab Pull, Ridge Push, and Basal Drag.

- **Slab Pull:** This is the dominant force driving modern plate tectonics. It occurs at convergent boundaries where cold, dense oceanic lithosphere subducts into the mantle. Because the subducting slab is denser than the surrounding hot mantle, it sinks, pulling the rest of the plate behind it like a heavy tablecloth sliding off a table.¹ This force explains why plates attached to large subduction zones (e.g., the Pacific Plate) move significantly faster than plates without them (e.g., the Atlantic plates). Modeling this requires the simulation to track the age and temperature of oceanic crust; without this data, the engine cannot calculate the gravitational potential energy driving the pull.²
- **Ridge Push:** Occurs at divergent boundaries (mid-ocean ridges). Here, the lithosphere is hot, thin, and thermally elevated. Gravity causes the plate to slide down the gentle slope of the asthenosphere away from the ridge axis.¹ While generally weaker than Slab Pull, Ridge Push is essential for the initial opening of ocean basins (rifting) and contributes to the stress state of the plate interior.
- **Basal Drag:** Represents the friction between the base of the lithosphere and the underlying mantle convection currents. While often secondary in terms of velocity magnitude, it is critical for modeling the “supercontinent cycle.” A large, stationary supercontinent acts as a thermal blanket, trapping heat in the mantle below. This eventually reverses the convection cells, creating an upwelling plume that rifts the continent apart.⁵

For the **plugin implementation**, the Foundation phase should implement a vector field summation where the net force \(\vec{F}_{\text{net}}\) on a plate is the integral of these boundary forces. This creates emergent behavior: the arrangement of boundaries dictates the kinematics. A plate surrounded by ridges will grow; a plate surrounded by trenches will shrink and accelerate.⁶

### 2.3 The Geometry of Movement: Spherical Kinematics

The architecture document implies movement, but it is vital to clarify the geometry. Tectonic motion occurs on the surface of a sphere, which means linear velocity vectors are insufficient. Plate motion must be described by Euler Poles—an axis of rotation passing through the center of the Earth.⁷

Every plate rotates around a unique Euler Pole. The linear velocity of any point on the plate depends on its distance from this pole. Points near the pole move slowly; points 90 degrees away move at maximum speed. This geometric reality creates complex boundary interactions. A single fault line might transition from a transform boundary to a convergent boundary simply because the curvature of the Earth changes the angle of interaction relative to the rotation pole.⁸

Implementing spherical kinematics (using quaternions or rotation matrices) is essential for avoiding the distortion artifacts common in planar map generation. It allows for the realistic opening of *“sphenochasms”*—V-shaped ocean basins that form when a continent rifts rotationally, like the opening of the Bay of Biscay or the Red Sea.⁹ If the Foundation phase relies on 2D grid logic, it will fail to produce these characteristic geometries, resulting in a world that looks like a flat map wrapped around a cylinder rather than a true planet.

## 3. Evaluation of the Existing Foundation Design

The current **`foundation.md` architecture** correctly identifies the cardinal interaction types (Convergent, Divergent, Transform) and the need to define plates. However, a deep analysis reveals significant gaps in realism coverage, particularly regarding the internal structure of plates and the nuance of their interactions.

### 3.1 Realism Coverage: The Missing Geological Actors

The current design focuses on *“generating land masses”* and *“defining plates.”* This phrasing suggests a model where land is treated as a monolithic entity. In reality, continents are complex collages of geologically distinct provinces. The absence of Cratons and Terranes is a major oversight.

#### 3.1.1 The Craton and Terrane System

A continent is not a uniform slab of rock. It consists of an ancient, stable core called a Craton (often Archean in age, >2.5 billion years old) and younger, mobile belts accreted around it.¹⁰ Cratons are characterized by extreme lithospheric thickness (roots extending >200 km deep) and rigidity. They resist deformation.¹¹ When continents collide, the cratons act as the “anvils,” while the younger, softer rocks between them crumple to form mountain ranges.

If the **simulation** omits cratons, it loses the logic for mineral distribution and mountain placement. Gold, diamonds (kimberlites), and platinum group elements are almost exclusively associated with ancient cratonic lithosphere.¹² Conversely, copper and silver are typically found in the younger *“Terranes”*—island arcs and micro-continents that have smashed into the craton.¹³ The Foundation phase must instantiate *“Craton”* objects within the continental plates to serve as the nucleation points for landmass growth and the anchors for resource logic.

#### 3.1.2 Intraplate Volcanism: Mantle Plumes

The design currently lists only boundary interactions. This ignores Mantle Plumes (Hotspots), which are responsible for some of the most distinct geography on Earth, such as Hawaii, Iceland, and Yellowstone.¹⁴ Hotspots are stationary thermal anomalies rooted deep in the mantle (possibly at the core-mantle boundary). As the tectonic plate moves over this stationary blowtorch, it burns a linear track of volcanoes across the surface.¹⁵

Including Mantle Plumes is essential for two reasons. First, it provides age-progressive geography—a chain of islands where one end is active and high (Hawaii) and the other is eroded and submerged (Emperor Seamounts).¹⁶ Second, plumes can trigger Large Igneous Provinces (LIPs) or Flood Basalts, which are massive volcanic events associated with mass extinctions and continental rifting.¹⁷ Without hotspots, the interiors of large plates in the **generated maps** will be geologically dead, lacking the strategic and resource diversity found in the real world.

#### 3.1.3 Crustal Aging and Bathymetry

The design must explicitly model the age of the oceanic crust. As oceanic lithosphere moves away from the mid-ocean ridge, it cools and thermally contracts. This causes the ocean floor to deepen with age.²

- **Bathymetry:** The depth of the ocean is a function of crustal age (\(Depth \propto \sqrt{Age}\)). This creates the characteristic abyssal plains and the gradual slope up toward the ridges.¹
- **Subduction Polarity:** When two oceanic plates collide, the older (and therefore denser) plate is the one that subducts. Without tracking age, the simulation cannot deterministically resolve which plate sinks and which forms the volcanic island arc.¹⁸

### 3.2 Boundary Interaction Fidelity

While the three main boundary types are listed, the Foundation phase must support the specific sub-types of these interactions to generate game-relevant terrain. The physical processes and resulting topographies differ vastly depending on the crustal type (Oceanic vs. Continental) involved.

#### 3.2.1 Convergent Boundary Nuances

- **Ocean-Continent Convergence:** This creates the classic subduction zone geometry. The oceanic plate sinks, creating a deep offshore trench. Fluids released from the subducting slab melt the mantle wedge, creating a Volcanic Arc on the continent (e.g., the Andes or Cascades).¹⁰
- **Ocean-Ocean Convergence:** This results in Island Arcs (e.g., Japan, Aleutians). The simulation must handle the creation of *“Back-Arc Basins”* caused by slab rollback, which separates the island arc from the main plate.¹⁸
- **Continent-Continent Convergence:** This is a collision event. Neither plate can subduct due to their low density. Instead, they fold, fault, and thicken, creating massive, non-volcanic mountain belts and high plateaus (e.g., Himalayas, Tibet).³ This is also where *“Suture Zones”* form—the scars of closed oceans.

#### 3.2.2 Divergent Boundary Nuances

- **Ocean-Ocean Divergence:** Seafloor spreading at Mid-Ocean Ridges. This is where new crust is generated. The Foundation phase must assign zero age and high heat flow to these zones.¹⁹
- **Continent-Continent Divergence:** Continental Rifting. This is a multi-stage process starting with doming and faulting (rift valleys like East Africa), progressing to flooding (linear seas like the Red Sea), and finally oceanization.¹⁰ The Foundation phase must act as a state machine tracking this evolution.

#### 3.2.3 Transform Boundary Nuances

Transform faults are rarely “pure” sliding boundaries.

- **Transtension:** If the fault bends such that plates pull slightly apart, it creates *“Pull-Apart Basins”* (e.g., the Dead Sea or Salton Sea).
- **Transpression:** If the fault bends such that plates push slightly together, it creates *“Pop-Up Structures”* or transverse ridges (e.g., the Transverse Ranges in California).²⁰

The Foundation phase needs to measure the angle of the fault relative to the motion vector to generate these localized, high-value strategic features.

### 3.3 Land-Water Relationship

The query specifically asks if the relationship between land, water, and plates is modeled accurately. The current procedural standard often treats *“land”* and *“plate”* as synonymous, or paints land onto plates using noise. This is physically incorrect. A tectonic plate is a rigid mechanical unit that typically contains both continental and oceanic crust.¹ The North American Plate, for example, extends from the San Andreas Fault in the west to the Mid-Atlantic Ridge in the east—half of it is dry land, and half is ocean floor.

**Emergent Coastlines:** The Foundation phase should not *“generate land masses”* as a separate step. Instead, it should generate Crustal Types on the plates. *“Land”* emerges wherever the crust is thick, low-density continental granite. *“Ocean”* exists wherever the crust is thin, high-density basalt. The coastline is merely the intersection of the isostatically calculated surface elevation and the global sea level.³

This approach allows for the simulation of Passive Margins—the transition zone between continent and ocean that is not a plate boundary (e.g., the eastern seaboard of the US). These regions are geologically stable, accumulate vast sediment wedges, and are prime locations for hydrocarbon resources.¹² If the Foundation phase forces all coastlines to be plate boundaries, it will fail to generate these crucial economic zones.

## 4. Completeness and Data Architecture

To serve as a robust foundation for downstream systems (Morphology, Petrology, Climate, Biomes), the Foundation phase must output more than just a heightmap and a list of plates. It must output a comprehensive Geological State Tensor for every cell in the grid.

### 4.1 Necessary Outputs for Downstream Stages

The Foundation phase must encapsulate the dynamic history into static data layers so that later stages do not need to re-simulate physics.

**Table 1: Required Static Outputs from Foundation Phase**

| Output Field     | Data Type           | Purpose for Downstream Systems                                                                 |
|------------------|---------------------|-----------------------------------------------------------------------------------------------|
| Crust ID         | Integer             | Identifies the specific geological block or terrane origin.                                    |
| Plate ID         | Integer             | Groups crustal units for kinematic movement logic.                                             |
| Crust Type       | Enum                | Oceanic / Continental / Transitional / Cratonic.                                               |
| Crust Age        | Float (Ma)          | Determines bathymetry depth, subduction priority, and thermal state.                           |
| Crust Thickness  | Float (km)          | Used for isostatic elevation, mountain root calculations, and mining depth.                    |
| Crust Density    | Float (g/cm³)       | The primary variable for isostasy calculations.                                                |
| Stress Tensor    | Vector3             | Compression, Tension, and Shear values. Drives folding and fracturing.                         |
| Heat Flow        | Float (mW/m²)       | Drives hydrothermal resource generation and geothermal potential.                             |
| Metamorphic Grade| Enum                | Low/Med/High pressure-temperature history. Determines stone types (Slate vs. Gneiss).          |
| Sediment Depth   | Float (km)          | Accumulation of eroded material. Affects aquifer capacity and oil generation.                  |
| Volcanism Mask   | Boolean             | Flags active magmatic provinces for soil fertility (Andisols) and hazards.                     |

### 4.2 Data Structures for Time Evolution

The user query asks about storing time slices or cumulative effects. For a system simulating geological eras, a simple 2D grid is insufficient because it has no memory. A Voxel-Stack or Stratigraphic Column approach is required.²¹

**The Stratigraphic Solution:**
Instead of a single value for *“Rock Type,”* each cell on the map should hold a simplified list (stack) of geological layers.

**Example Structure:** ``This structure allows for the *“very old world”* simulation the user desires.

- **Erosion Logic:** As the simulation runs, erosion subtracts from the thickness of the top layer. If the Mesozoic Basalt wears away, the Paleozoic Limestone is revealed. This creates complex geological maps where ancient rocks are exposed in the cores of eroded mountain ranges.²³
- **Resource Logic:** The Resource Generation phase can scan the entire stack. It might find coal in a buried Carboniferous layer or gold in the basement rock, even if they aren’t visible on the surface.²⁴
- **Data Efficiency:** While full voxels are memory-intensive, a Run-Length Encoded (RLE) stack of layers is highly efficient for geological data, as typically only 3–10 distinct layers exist in any given vertical column.²²

### 4.3 Graph-Based vs. Grid-Based Representation

Given the spherical nature of the simulation and the need for variable resolution (detailed coastlines vs. vast ocean plains), a Dual-Mesh Spherical Graph (Voronoi + Delaunay) is recommended over a traditional lat/long grid or cube-map.²⁵

- **Nodes (Delaunay vertices):** Store the physical data (thickness, density, velocity).
- **Cells (Voronoi regions):** Represent the surface area and pixels.
- **Plates:** Are simply collections of connected Nodes.
- **Boundaries:** Are the edges where Nodes of different Plate IDs connect.

This structure naturally handles the merging and splitting of plates without the artifacts of grid aliasing. It also facilitates the *“Transfer Mass”* function required for accretion, where nodes are reassigned from one Plate ID to another.²⁶

## 5. Time Evolution and the Wilson Cycle

The requirement to simulate *“multiple geological eras”* and *“very old worlds”* necessitates the implementation of the Wilson Cycle. This is the cyclical opening and closing of ocean basins that drives supercontinent assembly and dispersal.²⁸ A single iteration of plate movements is insufficient to generate the complexity of an ancient world; the simulation must loop through these phases.

### 5.1 The Six Stages of the Wilson Cycle

The Foundation stage must function as a state machine that transitions regions through the following phases:

1. **Embryonic Stage (Rifting):** A heat anomaly (plume) weakens a craton. Tension stress creates a Rift Valley. *Game Feature:* Linear lakes, volcanism, alkaline salts (e.g., East African Rift).
2. **Juvenile Stage (Opening):** The rift floods. New oceanic crust generates. *Game Feature:* Narrow seas with steep escarpments (e.g., Red Sea).
3. **Mature Stage (Spreading):** Wide ocean basin with passive margins. Cooling crust subsides. *Game Feature:* Abyssal plains, distinct continental shelves (e.g., Atlantic Ocean).
4. **Declining Stage (Subduction):** The crust becomes too old and dense. A trench forms, consuming the ocean floor. *Game Feature:* Island arcs, explosive volcanism (e.g., Pacific Ocean).
5. **Terminal Stage (Collision):** Continents collide. The intervening ocean is destroyed. Sediments are folded into accretionary wedges. *Game Feature:* High, non-volcanic mountain belts (e.g., Himalayas).
6. **Relic Stage (Suture):** The mountains erode. The collision zone becomes a scar (suture) in the continental interior. *Game Feature:* Eroded, mineral-rich ranges (e.g., Urals, Appalachians).

### 5.2 Implementation of Dynamic Modes

The Foundation stage must support a dynamic mode where the simulation iterates through time steps. A static generation (noise-based) cannot produce the complex adjacencies of an old world—for example, an ancient, eroded mountain belt running perpendicular to a new, active volcanic arc.⁶

**Proposed Iteration Logic:**

- **Phase A: Rifting (Breakup):** Heat builds up under a large continent (Supercontinent). A rift forms, splitting the mesh connectivity. New oceanic crust nodes are generated in the gap.¹⁰
- **Phase B: Drifting (Spreading):** Plates move according to the vector field summation of Ridge Push and Slab Pull. Passive margins accumulate sediment layers in their stratigraphic stacks.
- **Phase C: Collision (Assembly):** When plates collide, the simulation must check the density of the leading nodes.
  - **Ocean-Ocean:** The older node subducts (is removed or marked as mantle).
  - **Continent-Continent:** Nodes *“stack”* or thicken. The CrustThickness variable increases, triggering isostatic uplift.⁴
- **Repeat:** The new supercontinent eventually traps mantle heat (Basal Drag decreases, heat increases) and rifts again.¹⁷

### 5.3 Aggregating Eras: The “Ghost Range” Problem

The user asks if we should run separate simulations and aggregate them. The recommendation is to run one continuous simulation with persistent state. Blending two separate heightmaps creates physics artifacts. However, to achieve the *“eroded older ranges vs. newer ones”* effect, the simulation must implement a Weathering Decay Function.

- **Mechanism:** At the end of each tectonic tick (e.g., every 10 million years), the simulation applies a decay factor to elevation.
  - Active orogenic belts (current collision) gain height from tectonic forcing.
  - Inactive belts (past collisions) lose height based on a lithology-dependent erosion rate.⁷

- **Result:** A mountain range formed in the Paleozoic era will be worn down to low, rolling hills (like the Appalachians) by the time the Cenozoic era begins. A new collision in the Cenozoic will raise sharp, high peaks (like the Alps). This naturally creates the desired diversity without artificial blending.

Furthermore, the simulation must track Paleo-Latitude. If a landmass was at the equator during the Carboniferous era, it would accumulate significant biomass (coal). If it then drifts to the arctic, that coal deposit moves with it. The Foundation phase must log the latitude of each cell at the time of sedimentation to allow the resource generator to place climate-dependent resources correctly in the final map, regardless of their current position.³⁰

## 6. Downstream Implications: Connecting Physics to Gameplay

The outputs of the Foundation phase are not just for visual terrain; they form the logic for the game's strategic layers.

### 6.1 Petrology and Resource Generation

The generation of minerals should not be random noise. It must be a deterministic result of the tectonic history table provided by the Foundation phase. This connects the *“physics”* directly to the *“exploit”* gameplay loop.

**Table 2: Tectonic History to Resource Mapping**

| Tectonic Setting       | Physical Process                                                  | Resulting Game Resource                                  |
|------------------------|--------------------------------------------------------------------|----------------------------------------------------------|
| Volcanic Arc (Subduction) | Fluids from slab melt mantle wedge; fractionation.             | Porphyry Copper, Molybdenum, Gold, Silver.¹²             |
| Ophiolite Obduction (Uplift) | Slice of oceanic crust/mantle thrust onto land.            | Chromium, Nickel, Platinum Group Elements.¹²             |
| Continental Rift       | Evaporation in restricted, sinking basins.                         | Evaporites (Salt, Gypsum), Lithium Brines.³¹             |
| Passive Margin         | Long-term sedimentation of organic matter.                        | Limestones, Coal (if swamp), Oil/Gas (if marine shale).¹² |
| Cratonic Interior      | Deep mantle pressure, kimberlite pipes.                           | Diamonds, Rare Earth Elements.¹¹                         |
| Mid-Ocean Ridge        | Hydrothermal circulation of seawater.                             | Volcanogenic Massive Sulfides (Zinc, Lead).¹²           |
| Suture Zone            | High-pressure metamorphism.                                       | Gemstones (Rubies, Sapphires), Marble.³²                |

The Foundation phase outputs a *“Tectonic History Log”* for each region. The Resource Generation phase reads this log. If a tile was once a shallow sea (Mesozoic) and then buried (Cenozoic), it spawns Oil. If a tile was a volcanic arc (Paleozoic) and then eroded, it spawns Gold placers.

### 6.2 Climate Coupling

Tectonics drives long-term climate, which in turn drives the *“Biome”* layer. The Foundation phase determines the arrangement of continents, which dictates ocean currents and atmospheric circulation.

- **Gateway Simulation:** The Foundation phase must detect when land bridges form (e.g., Isthmus of Panama) or break (e.g., Drake Passage). Closing a gateway can stop equatorial currents, triggering ice ages. Opening a gateway can isolate a continent (like Antarctica), leading to deep freeze.³³
- **Orographic Lift:** The heightmaps generated by collision are the primary inputs for the rainfall simulator. High mountains block moisture, creating rain shadows (deserts) on the leeward side.³⁴ The Foundation phase must provide accurate, continuous mountain chains to ensure these climate barriers are effective.

### 6.3 Erosion and Sediment Transport

Erosion is not just a post-processing effect; it is a feedback loop. The removal of mass from mountains (erosion) and its deposition in basins (sedimentation) alters the isostatic balance, causing mountains to rise (rebound) and basins to sink (subsidence).³⁵

- **Sediment Routing:** The Foundation phase should ideally output a *“Basin Analysis”* vector, indicating the direction of sediment flow. This allows the Morphology layer to build realistic river networks and deltas, which are crucial for early-game civilization starts (agriculture).³⁶

## 7. Conclusion and Implementation Roadmap

The current *“Foundation”* design for the **mapgen plugin** serves as a conceptual starting point but requires significant expansion to meet the goal of a *“physics-driven”* engine capable of simulating *“very old worlds.”* The shift from a kinematic sketch (moving shapes) to a geodynamic simulation (forces, rheology, and history) is substantial but necessary for the desired level of realism.

### 7.1 Key Architectural Recommendations

1. **Adopt Spherical Geometry:** Abandon 2D grid logic for plate movement. Implement Euler Pole rotations using spherical graphs (Voronoi/Delaunay) to capture accurate distortion and boundary geometries.⁷
2. **Implement Rheological Properties:** Define plates by Density, Thickness, and Temperature, not just shape. Use these properties to calculate Isostatic Elevation.³
3. **Integrate the Wilson Cycle:** Structure the simulation loop around the six stages of ocean basin evolution (Rift → Drift → Collide → Suture) to drive time-evolution.²⁸
4. **Use Stratigraphic Data Structures:** Replace simple cell values with Stack/List structures to store geological history (Strata) for each location. This enables *“old world”* features and deterministic resource generation.²¹
5. **Add Critical Missing Actors:** Explicitly model Cratons (for stability/resources), Terranes (for accretion), and Mantle Plumes (for intraplate volcanism).¹¹

### 7.2 The “Foundation” Checklist

To directly answer the prompt’s completeness questions:

- **Are we missing key concepts?** Yes. Cratons/Terranes, Mantle Plumes (Hotspots), Crustal Age tracking, Isostatic Rebound, and the distinctions between mechanical Lithosphere and chemical Crust.
- **Are interaction types fully represented?** Partially. You need to explicitly model the transition between types (e.g., Rift transforming into Ridge) and the oblique motions (Transpression/Transtension) which generate complex fault topography.
- **Is the land/water relationship accurate?** No. Land must be an emergent property of crustal thickness and density, allowing for passive margins and continental shelves. It should not be a pre-defined attribute of the plate.
- **Are outputs sufficient?** No. To support realistic Petrology and Climate, the Foundation phase must output Stress Tensors, Heat Flow maps, Sediment History stacks, and Paleo-Latitude logs.

By integrating these elements, the Foundation phase will evolve from a simple map generator into a robust planetary history engine. This will provide the **plugin development team** with a procedurally generated world that possesses not just visual variety, but deep, interconnected systems of geology, resources, and geography that reward player exploration and strategic planning. The world will not just look real; it will behave according to the laws of physics, creating a deeply immersive foundation for the civilization simulation to follow.
