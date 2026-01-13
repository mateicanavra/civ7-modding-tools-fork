# Physics-Based Planetary Modeling for Procedural Generation: A Data-Driven Task Graph Approach

> **Status:** Research spike (seed / non-canonical)
>
> **Do not treat as contract truth.** This document contains deep first-principles physics framing and candidate staging ideas, but it is not guaranteed to match the current SDK’s canonical contracts.
>
> **Canonical modeling references (preferred):**
> - `docs/system/libs/mapgen/architecture.md`
> - `docs/system/libs/mapgen/foundation.md`
> - `docs/system/libs/mapgen/morphology.md`
> - `docs/system/libs/mapgen/hydrology.md`
> - `docs/system/libs/mapgen/ecology.md`
> - `docs/system/libs/mapgen/narrative.md`
> - `docs/system/libs/mapgen/placement.md`
>
> **How to use this spike now:** mine it for “from scratch” physics insights, then rewrite the resulting target model into the canonical domain docs rather than copying proposed APIs/surfaces verbatim.

## Executive Summary

This comprehensive research report outlines the architectural and scientific framework for a modular, physics-based map generation engine designed for a high-fidelity 4X strategy game. Building upon a Data-Driven Task Graph architecture and a spherical Voronoi mesh data structure, this document details the physical principles and simulation strategies required to achieve “causal realism.” The objective is not to replicate computationally prohibitive engineering simulations (e.g., full Navier-Stokes fluid dynamics), but to implement robust field-based abstractions that produce geologically and climatically consistent worlds. The analysis rigorously dissects six primary domains—Geomorphology, Oceanography, Climatology, Hydrology, Pedology/Geology, and Ecology—providing for each a breakdown of real-world processes, simulation staging, API definition, parameter levers, and abstraction strategies suitable for graph-based processing. Furthermore, it identifies critical “missing links” such as the cryosphere and albedo feedback loops that are essential for plausible planetary evolution.

## 1. Geomorphology (The Shape of the Land)

Geomorphology, the study of the physical features of the surface of the earth and their relation to its geological structures, serves as the foundational stage of the procedural pipeline. It bridges the gap between the raw tectonic uplift provided by the “Foundation” stage and the final heightmap that dictates gameplay traversal, hydrology, and biome distribution. The goal is to simulate the contest between endogenic (internal) forces that build relief and exogenic (external) forces that tear it down.

### 1.1 The Real-World Domain

The evolution of topography is governed fundamentally by the competition between uplift (tectonic forces raising the land) and denudation (erosional forces wearing it down). To achieve causal realism, the system must simulate three distinct erosion mechanisms and the crucial role of lithology:

- **Fluvial (Hydraulic) Erosion:** This is the primary sculptor of landscapes. It involves the mechanical detachment and transport of bedrock and sediment by flowing water. The process is mathematically described by the Stream Power Incision Model (SPIM), which posits that erosion rate ($E$) is a power function of drainage area ($A$, a proxy for water discharge) and local slope ($S$). The relationship is generally expressed as $E = K A^m S^n$, where $K$ is erodibility, and $m$ and $n$ are exponents typically around 0.5 and 1.0, respectively.1
- **Thermal (Hillslope) Erosion:** Unlike channelized water flow, hillslope erosion is a diffusive process governed by gravity, freeze-thaw cycles, and biological disturbance. It moves material from local maxima (peaks) to local minima (valleys), smoothing sharp tectonic features into convex hilltops. This process is essentially a diffusion operation where the flux of sediment is proportional to the slope gradient.2
- **Glacial Erosion:** Ice creates distinct topographical signatures that water cannot duplicate. While rivers carve V-shaped valleys, glaciers scour bedrock to create U-shaped valleys, hanging valleys, and sharp arrêtes. Glacial erosion rates correlate with ice sliding velocity and are capable of over-deepening valleys below sea level (fjords).1
- **Sedimentation:** Mass cannot simply disappear; it must be conserved. Eroded material is transported downslope and deposited in low-energy environments—sedimentary basins, river deltas, and coastlines—building new land and flattening valley floors. This deposition creates the fertile plains crucial for 4X expansion.1
- **Lithology (Rock Hardness):** Real terrain is not uniform. Differential erosion occurs because softer sedimentary rocks erode orders of magnitude faster than harder igneous or metamorphic rocks. This variance is what creates “hogback” ridges, resistant plateaus, and waterfalls where rivers cross from hard to soft rock.3

### 1.2 Simulation Staging

- **Order:** Geomorphology must execute after the Foundation stage (which provides crustal plates, uplift maps, and initial rock types) but before Hydrology and Climatology. While real-world erosion is coupled with climate (rainfall drives erosion), a full feedback loop is computationally expensive. The recommended approach is to use a “generalized” or “paleo-climate” for the initial erosion pass to define the terrain shape, or run a simplified iteratively coupled loop where initial uplift creates a rain shadow, which then intensifies localized erosion.1

#### Internal Steps (The “Erosion Cycle”)

1. **Uplift Integration:** Apply tectonic uplift vectors ($U$) to the base Voronoi mesh height field ($z$). $z_{new} = z_{old} + U \cdot \Delta t$.
2. **Lithology Mapping:** Map the input “Crust Type” to a scalar “Erodibility Coefficient” ($K$) field. For example, Granite gets a low $K$, whilst Sandstone gets a high $K$.
3. **Flow Routing:** Calculate a Directed Acyclic Graph (DAG) of flow directions on the mesh to determine drainage area ($A$) for every node.4
4. **Hydraulic Incision:** Calculate stream power at each node: $Stream Power = K \cdot Area^m \cdot Slope^n$. Subtract this value from the heightmap.1
5. **Thermal Weathering:** Apply a diffusion pass (Laplacian smoothing) to relax slopes that exceed the angle of repose, simulating landslides and soil creep.2
6. **Sediment Transport & Deposition:** Move detached sediment downslope. If the stream power (carrying capacity) drops below the sediment load (e.g., when a river hits a flat basin), deposit the excess material, raising the elevation.5

### 1.3 Inputs & Outputs (The API)

- **Hard Dependencies:**
  - Voronoi Graph Topology: The mesh structure (neighbors, edge lengths) is required for gradient and Laplacian calculations.1
  - Tectonic Uplift Map: Vertical displacement vectors per node derived from plate collisions.1
  - Crust Type ID: Essential for the Lithology step to determine rock hardness ($K$).3

- **Outputs:**
  - Elevation Field (Heightmap): The final vertical position of vertices after uplift and erosion.1
  - Sediment Depth Field: The thickness of loose material (regolith) sitting on top of bedrock. This is a critical input for the Pedology stage (farming potential).5
  - Paleo-River Network: The drainage graph generated during erosion often serves as the blueprint for the final Hydrology stage.7

### 1.4 The Levers (Parameters)

- **Primary Levers:**
  - Global Erosion Rate ($K_{avg}$): A scalar that modulates the aggressiveness of the hydraulic erosion. High values produce flattened, “senile” landscapes (like the Appalachians); low values preserve jagged, tectonic-dominated peaks (like the Himalayas).2
  - Simulation Duration ($T_{total}$): Controls the geological time simulated. Longer durations allow rivers to carve deeper canyons and transport sediment further, creating massive deltas.1

- **Secondary Levers:**
  - Talus Angle (Angle of Repose): The critical slope angle for thermal erosion. Lowering this results in smoother, more rolling hills; raising it allows for steep cliffs.2
  - Sediment Capacity Constant: Determines how much “dirt” a unit of water can carry. High capacity strips mountains to bedrock; low capacity fills valleys quickly, creating broad floodplains.1

### 1.5 Abstraction Strategy

Simulating erosion on a Voronoi mesh requires adapting grid-based algorithms to an irregular graph. The Stream Power Law is the robust abstraction of choice for this architecture because it focuses on the result of erosion rather than the particle physics of water.

#### The Field-Based Abstraction

Instead of simulating thousands of individual water droplets (Lagrangian particles), which is computationally expensive and noisy, use an Eulerian field approach on the graph. The evolution of height $z$ is solved via the differential equation:

$$
\frac{\partial z}{\partial t} = U - K A^m |\nabla z|^n + \nabla \cdot (D \nabla z)
$$

Where:
- $U$ is tectonic uplift.
- $K$ is the erodibility coefficient (derived from rock type).
- $A$ is the upstream drainage area (calculated via flow accumulation).
- $|\nabla z|$ is the local slope magnitude.
- The term $\nabla \cdot (D \nabla z)$ represents thermal diffusion, where $D$ is the diffusion coefficient.1

#### Implementation on Task Graph

- **Flow Routing:** Compute flow directions. On a Voronoi mesh, a “Steepest Descent” approach is standard: each node points to its lowest neighbor. This creates a forest of trees (drainage basins).4
- **Accumulation:** Traverse the flow graph from leaves (high points) to roots (sinks/ocean) to sum drainage area $A$. This can be done in linear time $O(N)$ using a topological sort (Kahn’s Algorithm).1
- **Analytic Solutions:** Recent graphics research1 suggests using analytical solutions to the stream power law. This allows the generator to “jump” to a specific time $t$ in a single massive step rather than iterating thousands of small time steps. This is highly efficient for generating the base terrain shape, though iterative steps may still be needed for sediment deposition.

## 2. Oceanography (The Heat Engine)

Oceanography is frequently neglected in 4X games, treated merely as a flat blue traversal zone. However, for “causal realism,” it is the planet’s primary heat redistribution system. It explains climatic anomalies (e.g., why Europe is warmer than Canada at the same latitude) and dictates marine resource distribution.

### 2.1 The Real-World Domain

Ocean circulation is driven by two distinct but coupled systems:

- **Wind-Driven Surface Currents (Gyres):** The friction of wind on the water surface, combined with the Coriolis effect, drives surface currents. In the open ocean, these form large rotating systems called Gyres—clockwise in the Northern Hemisphere, counter-clockwise in the Southern. These gyres transport warm equatorial water toward the poles (western boundary currents like the Gulf Stream) and cold polar water toward the equator (eastern boundary currents like the California Current).8
- **Thermohaline Circulation (Deep Water):** This is the “Great Ocean Conveyor Belt,” driven by density differences rather than wind. Cold, salty water is dense and sinks (Deep Water Formation), typically in the North Atlantic and around Antarctica. This sinking pulls warm surface water poleward to replace it, acting as a massive planetary radiator.10

### 2.2 Simulation Staging

- **Order:** Oceanography must run after Geomorphology (as continents define the shape of ocean basins) and concurrently or iteratively with Climatology.

- **Ideal Flow:**
  1. Basic Climatology (Planetary Winds).
  2. Ocean Currents (driven by winds and basins).
  3. Advanced Climatology (Air temperature adjusted by ocean heat transport).

#### Internal Steps

1. **Basin Identification:** Run a flood-fill or union-find algorithm to identify connected ocean regions and separate inland seas.
2. **Wind Stress Mapping:** Map the surface wind vectors (from Climatology) to ocean nodes.
3. **Gyre Generation:** Calculate the vector field for surface currents based on wind curl and continental boundaries.
4. **Temperature Advection:** “Move” heat along the current vectors.
5. **Sea Ice Formation:** Check for freezing temperatures to generate sea ice, which feeds back into Albedo.12

### 2.3 Inputs & Outputs (The API)

- **Hard Dependencies:**
  - Land/Ocean Mask: Derived from the Geomorphology heightmap.13
  - Global Wind Field: From the initial Climatology pass.
  - Bathymetry: Ocean depth is required if modeling deep water formation or shelf resources.14

- **Outputs:**
  - Sea Surface Temperature (SST): The critical input for climate moderation and hurricane generation.15
  - Current Vectors: A vector field affecting naval unit movement speed and direction.16
  - Sea Ice Extent: Dynamic blocking of navigation routes and a key factor in planetary Albedo.17

### 2.4 The Levers (Parameters)

- **Primary Levers:**
  - Global Sea Level: Determines the land/ocean ratio and the connectivity of basins (e.g., does a Panama isthmus exist?).
  - Planetary Rotation Direction: Determines the direction of the Coriolis deflection and thus the rotation direction of the Gyres.18

- **Secondary Levers:**
  - Ocean Heat Transport Efficiency: A scalar determining how effectively currents equalize global temperatures. High values lead to mild poles; low values create extreme latitudinal gradients.
  - Salinity Threshold: Controls how easily sea ice forms (saltier water depresses the freezing point).

### 2.5 Abstraction Strategy

Solving fluid dynamics (Navier-Stokes) on a rotating sphere is computationally prohibitive for a game generator. We abstract this using Vector Field Manipulation and Graph Diffusion.

#### The Abstraction

- **Gyre Generation via Curl:** Instead of simulating fluid drag, procedurally place “Gyre Centers” in the middle of large ocean basins (identifiable via the Voronoi dual graph).
- **Vector Field Construction:** Assign a rotational vector field around these centers (Clockwise North, Counter-Clockwise South).
- **Continental Deflection:** Real currents flow parallel to coastlines. Implement this by calculating the gradient of the “Distance Field to Land.” Cross this gradient with the vertical axis to get a tangent vector that hugs the coast.9

#### Graph Implementation

For each ocean node:

```
CurrentVector = w1 * WindVector + w2 * GyreVector + w3 * CoastTangent
```

- **Temperature Advection:** Use a simplified advection-diffusion solver on the Voronoi graph to simulate heat transport.

$$
T_{new} = T_{old} - (\vec{V} \cdot \nabla T) \Delta t + D \nabla^2 T
$$

This equation moves temperature $T$ along current velocity $\vec{V}$. In the graph context, this translates to “pulling” temperature from the upstream neighbor and blending it with the local temperature.19 This creates the “streams” of warm water moving poleward.

## 3. Climatology (The Atmosphere)

Climatology is the engine of the biosphere. In a causal system, biomes are not “painted” via noise; they are the emergent result of temperature, pressure, and rainfall calculations. This domain governs the distribution of heat and moisture across the planetary mesh.

### 3.1 The Real-World Domain

The atmosphere operates as a global heat engine driven by solar energy.

- **Global Circulation (The Three-Cell Model):** Uneven heating (equator vs. poles) creates pressure belts. Hot air rises at the Equator (Intertropical Convergence Zone - ITCZ), creating Low Pressure. It cools and sinks at ~30° latitude, creating High Pressure subtropical ridges. This loop is the Hadley Cell. Similar circulation exists at mid-latitudes (Ferrel Cells) and poles (Polar Cells).
- **Surface Winds:** The Coriolis effect deflects these meridional (north-south) flows. Air moving toward the equator deflects west, creating the Trade Winds (Easterlies). Air moving toward the poles deflects east, creating the Westerlies.20
- **Orographic Lift:** This is the primary interaction between terrain and weather. When moist air encounters a mountain range, it is forced upward. As it rises, it cools adiabatically (expanding due to lower pressure). Cold air holds less water, forcing condensation and precipitation on the windward side. The descending air on the leeward side warms and dries, creating a Rain Shadow (desert).22

### 3.2 Simulation Staging

- **Order:** Runs after Oceanography (SSTs are needed for evaporation) and Geomorphology (mountains are needed for rain shadows).

#### Internal Steps

1. **Insolation Calculation:** Calculate solar energy input based on latitude and axial tilt.
2. **Temperature Base:** Determine baseline air temperature from insolation minus the Lapse Rate (typically -6.5°C per km of elevation).22
3. **Pressure & Wind Generation:** Generate global wind vectors based on the idealized Three-Cell Model (Hadley/Ferrel).
4. **Moisture Advection:** Transport water vapor from ocean nodes over land nodes using the wind field.
5. **Precipitation Calculation:** Calculate rainfall based on saturation limits (Dew Point) and Orographic Lift events.

### 3.3 Inputs & Outputs (The API)

- **Hard Dependencies:**
  - Heightmap: Critical for calculating the lapse rate cooling and orographic lift.24
  - Ocean Mask: Serves as the source of moisture (evaporation).25
  - Sea Surface Temperature: Heats the overlying air and drives evaporation rates.

- **Outputs:**
  - Air Temperature: Yearly average and seasonal variance (Summer/Winter).
  - Precipitation: Annual rainfall total.25
  - Wind Vector Field: Prevailing wind direction used for gameplay mechanics (sailing speeds, fallout spread).

### 3.4 The Levers (Parameters)

- **Primary Levers:**
  - Axial Tilt (Obliquity): The “God Parameter” for seasonality. 0° results in no seasons; 23.5° is Earth-like; 90° creates extreme seasonal variations.
  - Solar Constant: The intensity of the sun, scaling global temperatures.

- **Secondary Levers:**
  - Adiabatic Lapse Rate: How fast temperature drops with height (default ~6.5°C/km). Tweaking this changes the “snow line” on mountains.
  - Rain Shadow Intensity: A multiplier for how much moisture is extracted over mountains. High values create stark desert/jungle contrasts; low values allow moisture to bleed deep inland.

### 3.5 Abstraction Strategy

We avoid solving full Navier-Stokes equations for the atmosphere. Instead, we use a Discrete Circulation & Transport Model.

#### The Abstraction

- **Zonal Wind Model:** Divide the planet into latitude bands representing the cells (0-30°, 30-60°, 60-90°). Assign default wind vectors (NE/SE Trades, Westerlies) to these bands. Blend these bands using a sigmoid function to create smooth transitions.18
- **Moisture Transport (The “Water Bucket” Model):** Treat moisture as a scalar value moving across the Voronoi graph.
  - **Evaporation:** If a node is Ocean, `Moisture += Temperature * EvapFactor`.
  - **Advection:** Move moisture to the downwind neighbor.
  - **Orographic Lift:** Calculate `DeltaHeight = Height(Current) - Height(Previous)`.
    - If `DeltaHeight > 0`: The air is cooling. Calculate `Precipitation = Moisture * (DeltaHeight * LiftFactor)`. Remove that amount from the moisture packet (conservation of mass).25
    - If `DeltaHeight < 0` (Downslope): The air is warming. `Precipitation = 0`. This naturally creates the Rain Shadow.
  - **Temperature Diffusion:** Apply a diffusion pass to smooth temperatures between adjacent nodes, simulating the mixing of air masses.

## 4. Hydrology (Surface Water)

Hydrology simulates the flow of liquid water after it has fallen as rain. This stage is responsible for generating the river networks, lakes, and groundwater systems that are vital for civilization placement.

### 4.1 The Real-World Domain

- **Drainage Basins (Watersheds):** The fundamental unit of hydrology. It is the area of land where all precipitation collects and drains off into a common outlet (usually the ocean, sometimes an endorheic lake).
- **River Formation:** Water flows downhill, accumulating volume. As discharge ($Q$) increases, channels widen and erode deeper. This follows Horton’s Laws of stream order.
- **Lakes:** Lakes form in local minima (depressions) where inflow exceeds outflow plus evaporation. If a depression fills until it spills over, it becomes an Exorheic (open) lake. If evaporation balances inflow before spilling, it becomes an Endorheic (closed) salt lake.27
- **Groundwater:** Not all water flows on the surface. A portion infiltrates into porous rock (aquifers), moving via Darcy’s Law, and can resurface as springs. This buffering effect maintains base flow in rivers during dry seasons.4

### 4.2 Simulation Staging

- **Order:** Runs after Climatology (Rainfall is the input) and Geomorphology (Slope is the driver).

#### Internal Steps

1. **Depression Filling:** Identify local minima in the heightmap. Fill them virtually to their “spillover” level to create a continuous path for water to the ocean.27
2. **Flow Direction Solving:** For every node, identify the single steepest descent neighbor. This defines the drainage topology.4
3. **Flow Accumulation:** Traverse the graph (using a topological sort) to sum Rainfall + UpstreamFlow for every node.29
4. **River Classification:** Threshold the accumulated flow to classify edges as “Streams,” “Rivers,” and “Major Rivers.”
5. **Lake Generation:** Compare the “filled” height from Step 1 with the original height. Areas where `FilledHeight > OriginalHeight` are lakes.

### 4.3 Inputs & Outputs (The API)

- **Hard Dependencies:**
  - Precipitation Map: The source term for flow accumulation.25
  - Elevation Map: Defines the gradient for flow direction.4

- **Outputs:**
  - River Segments: Graph edges marked as rivers with an associated Discharge volume.
  - Lake Bodies: Groups of nodes identified as pooled water.
  - Freshwater Availability: A resource layer for cities and agriculture.

### 4.4 The Levers (Parameters)

- **Primary Levers:**
  - Sea Level: The ultimate “Base Level” for all drainage.
  - River Threshold: The amount of accumulated moisture required to render a visible river. High threshold = fewer, larger rivers; low threshold = many small streams.

- **Secondary Levers:**
  - Meander Factor: Adds procedural noise to flow paths for visual interest (if generating geometry for the river mesh).
  - Endorheic Probability: The tendency for lakes to evaporate rather than overflow. This controls the frequency of salt lakes vs. freshwater lakes.

### 4.5 Abstraction Strategy

Hydrology on a Voronoi mesh is a classic Graph Theory problem.

#### The Abstraction

- **Planchon-Darboux Algorithm:** This is the standard algorithm for depression filling. It iteratively raises the elevation of local minima until they can drain to a lower neighbor. It guarantees a valid flow path from every land node to the ocean edge. The volume of water “added” to fill the depression defines the Lake geometry.
- **Flux Accumulation:**

$$
Flux_i = P_i + \sum_{j \in Upstream} Flux_j
$$

Where $P_i$ is local precipitation. This is computed efficiently in $O(N)$ time.

- **River Rendering:** The visual width of the river should be a function of the square root of discharge ($\sqrt{Flux}$), following the empirical Leopold’s power laws for channel geometry.29
- **Groundwater Abstraction:** A simple “Soil Moisture” bucket model can suffice. `SoilMoisture = Precipitation - Evaporation - Runoff`. This value is critical for the next stage (Pedology/Ecology).30

## 5. Pedology & Geology (Soil & Resources)

This stage acts as the bridge between the physical world and the game economy (Resources). It determines what is in the ground, based on the history of the previous layers.

### 5.1 The Real-World Domain

- **Soil Formation (Pedogenesis):** Soil is not random; it is described by the CLORPT equation: $Soil = f(Climate, Organisms, Relief, Parent Material, Time)$.31
- **Laterite soils:** Form in high rain/high temp (tropical) zones; nutrient-poor due to intense leaching.
- **Chernozem:** Form in temperate grasslands; organic-rich, distinct black color, ideal for farming.
- **Resource Formation Logic:**
  - **Coal:** Formed from ancient peat swamps. Requires high biomass production + stagnant water (anoxic conditions) to prevent decay.32
  - **Oil:** Formed from marine microorganisms (plankton) deposited in anoxic ocean basins, then buried and heated. Typically found in sedimentary basins and trapped by anticlines.32
  - **Iron:** Major deposits (Banded Iron Formations - BIFs) formed in ancient oceans due to oxygenation events (Great Oxidation Event). They are sedimentary rocks, often exposed by later erosion.34

### 5.2 Simulation Staging

- **Order:** Runs after all physical layers (Geo, Ocean, Climate, Hydro).

#### Internal Steps

1. **Soil Classification:** Map `(RockType, Temp, Rain) -> SoilType` using a lookup table (e.g., a simplified USDA taxonomy).
2. **Resource Scattering:**
   - **Strategic Resources:** Use “Logical Placement” rules (e.g., “If sedimentary rock + history of ocean = Oil chance”).
   - **Luxury Resources:** Biome-dependent (e.g., Gold in mountains, Spices in tropical forests).

### 5.3 Inputs & Outputs (The API)

- **Hard Dependencies:**
  - Bedrock Type: Igneous/Sedimentary/Metamorphic from the Foundation stage.35
  - Climate Data: Temp/Rain is the primary driver for soil type.31
  - Biome Data: Required for placing biological resources (furs, dyes).

- **Outputs:**
  - Soil Fertility: A scalar modifier for agriculture yield.
  - Resource Map: Locations of Iron, Coal, Oil, Uranium, etc.36

### 5.4 The Levers (Parameters)

- **Primary Levers:**
  - Resource Abundance: Global multiplier for resource density.
  - Geological Age: Old worlds have more eroded mountains and potentially more coal/oil (longer time for formation); young worlds have more volcanism and raw minerals.

- **Secondary Levers:**
  - Strategic Balance: A “bias” parameter to force the spread of critical resources (Iron/Oil) to prevent “start screwing” (where a player has no access to vital tech).

### 5.5 Abstraction Strategy

Since we cannot simulate 4 billion years of history, we use Heuristic Logic and Cellular Automata for placement.

#### The Abstraction

- **Logic-Based Placement:** Instead of random Perlin noise, use conditional probability fields.
  - $P(Coal)$ is high if Elevation is low AND Moisture is high (simulating ancient swamps) AND RockType is Sedimentary.
  - $P(Iron)$ is high if RockType is Ancient/Igneous or Metamorphic (Shield geology).
  - $P(Oil)$ is high if Location is Continental Shelf or Lowland Basin.37
- **Clustering via Cellular Automata:** Use a CA smoothing pass to group resources. Instead of single tiles of coal, creating a “Coal Basin” (clusters of 3-4 tiles) creates strategic regions of interest worth fighting over.38

## 6. Ecology (Biomes)

Ecology is the visualization and gameplay classification layer. It translates the raw simulation data (Temp, Rain) into understandable concepts (Desert, Jungle, Tundra).

### 6.1 The Real-World Domain

- **Whittaker Classification:** The standard ecological model mapping Temperature (x-axis) and Precipitation (y-axis) to Biomes.
- **Holdridge Life Zones:** A more complex model that includes Evapotranspiration. It classifies regions not just by rain, but by “effective moisture” (rain that doesn’t evaporate immediately). This is superior for distinguishing between a “Hot Desert” and a “Cold Tundra” which both have low rain.39
- **Ecotones:** The transition zones between biomes (e.g., Savanna lies between Jungle and Desert).
- **Seasonality:** The oscillation of the visual state (snow cover, leaf color) based on the time of year.

### 6.2 Simulation Staging

- **Order:** The final stage of the generation pipeline.

#### Internal Steps

1. **Data Aggregation:** Gather Temp, Rain, Soil, and Height for each node.
2. **Biome Classification:** Query the Whittaker or Holdridge lookup table.
3. **Sub-Biome Variation:** Use Perlin noise or local parameters (like drainage) to vary within a biome (e.g., Forest -> Dense Forest vs. Open Woods).

### 6.3 Inputs & Outputs (The API)

- **Hard Dependencies:**
  - Temperature: Annual Average.40
  - Precipitation: Annual Total.40

- **Outputs:**
  - Biome ID: Enum (Desert, Tundra, Rainforest, etc.).
  - Vegetation Density: Used for placing tree meshes/billboards.41

### 6.4 The Levers (Parameters)

- **Primary Levers:**
  - Wet/Dry Bias: Global offset for precipitation to shift the world towards “Arid” or “Lush.”
  - Temp Bias: Global offset for Ice Age vs. Greenhouse Earth.

- **Secondary Levers:**
  - Biome Distinctness: Controls the “fuzziness” of boundaries. Sharp boundaries look like distinct zones; fuzzy boundaries blend textures.

### 6.5 Abstraction Strategy

#### The Abstraction

- **Holdridge Life Zones / Whittaker Diagram:** Implement this as a 2D Texture Lookup or a simple logic tree.

```
if (Temp < -5) return Tundra;
else if (Rain < 250mm) return Desert;
else if (Rain > 2000mm && Temp > 20) return Rainforest;
```

- **Dynamic Seasons:** Instead of regenerating biomes every turn, apply a shader-based visual layer.

```
CurrentTemp = BaseTemp + SeasonalAmplitude * cos(Time)
```

If `CurrentTemp < 0`, the shader blends in a SnowTexture. This allows “Winter” to visually creep down from the poles dynamically during gameplay without altering the underlying data mesh.42

## 7. Integration & Missing Links

### 7.1 The Feedback Loop (The “Missing Link”)

Most procedural generators are feed-forward (A -> B -> C). A truly living world requires Feedback Loops, specifically the Albedo-Temperature Feedback.

- **The Mechanism:**
  1. Calculate Temperature -> Determine Snow/Ice Cover.
  2. Feedback: Snow/Ice has high Albedo (reflectivity, ~0.8) compared to Land/Ocean (~0.1-0.3).43
  3. Reflect solar energy: `Insolation_Effective = Insolation * (1 - Albedo)`.
  4. Recalculate Temperature.

- **Simulation Consequence:** This creates “tipping points.” If you cool the world slightly, ice expands, reflecting more heat, cooling the world further (Glaciation). If you warm it, ice melts, absorbing more heat (Runaway Greenhouse). Implementing this adds emergent climate stability/instability to the game.44

### 7.2 The Cryosphere

Often overlooked is the specific modeling of Glaciers.

- **Accumulation:** Snow that doesn’t melt in summer becomes firn/ice.
- **Flow:** Ice behaves like a high-viscosity fluid, eroding terrain (U-valleys) and acting as a freshwater reservoir.
- **Abstraction:** A slow “sediment” pass in the Geomorphology stage can simulate glacial carving, while a dynamic ice layer in Oceanography handles sea ice.

### 7.3 Data-Structure Integration (Voronoi)

- **Storage:** All fields (Height, Temp, Rain, Flux) are properties of the VoronoiCell struct.
- **Parallelization:** The Task Graph architecture allows stages to run in parallel where dependencies permit. For example, “Soil Classification” and “River Rendering” can run simultaneously once the Hydrology stage is complete.
- **Optimization:** Use Dual Graph navigation. Use the Voronoi centers for biome data (faces), but use the Delaunay edges for river routing (boundaries), ensuring rivers flow between cells rather than through them.45

## Conclusion

By structuring the pipeline into these six causal domains—Geomorphology, Oceanography, Climatology, Hydrology, Pedology, and Ecology—we achieve a simulated world that possesses internal logic. A player seeing a desert knows it exists because of a mountain range blocking the wind (Rain Shadow), not because a noise function rolled a specific value. This causal realism enhances strategic depth, as the “levers” available to the designer (and potentially the player, via terraforming) behave predictably and scientifically. The key is applying graph-based field abstractions (Diffusion, Advection, Flow Accumulation) rather than heavy particle simulations, ensuring the engine remains performant for a game environment.
