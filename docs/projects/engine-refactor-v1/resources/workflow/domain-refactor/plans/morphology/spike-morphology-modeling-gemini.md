VERSION 1 (must synthesize with other version below):

Phase 2: Morphology Modeling SpikeStatus: Authoritative ModelAuthor: SystemDate: 2025-05-18Scope: Canonical domain model, causality spine, and configuration semantics for the refactored Morphology domain.Supersedes: resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield.md1. Executive Summary & Core PhilosophyThe Morphology domain is responsible for the physical form of the planet. It abandons the legacy "Painter's Algorithm" (randomly placing hills/mountains) in favor of a Geophysical Simulation where topography creates the conditions for biomes, rather than biomes dictating topography.Core Modeling Principles:Isostasy as Baseline: The world is not a flat plane with hills added. It is a set of crustal plates floating on the mantle. "Ocean" is primarily defined by thin, dense oceanic crust (low elevation), while "Land" is defined by thick, buoyant continental crust (high elevation). Bathymetry is a first-class citizen.Vector-Driven Orogeny: Mountain ranges, rifts, and trenches are the mathematical result of Plate Velocity A interacting with Plate Velocity B along a boundary. We simulate stress to derive elevation.Process Separation:Tectonics builds structure (low frequency, high amplitude).Volcanism injects point-features (high frequency, high amplitude).Structural Erosion wears structure down (thermal weathering/talus).No Narrative Overlays: Narrative control is achieved by biasing the inputs (e.g., placing a specific plate boundary or crust shape), never by overwriting the output pixels.2. Architecture & Data Flow2.1 The Causality SpineThe pipeline executes a linear simulation. Feedback loops (e.g., hydro-erosion) are strictly downstream or deferred to prevent circular dependencies.graph TD
    subgraph "Upstream: Foundation"
        F_Plates[Plate Graph (IDs, Crust Type)]
        F_Vectors[Tectonic Vectors (Velocity)]
        F_Mesh[Voronoi Mesh]
    end

    subgraph "Domain: Morphology"
        direction TB
        
        %% Step 1: Base Crust
        M1[1. Compute Base Crust]
        note1[Isostasy: Continental vs Oceanic baseline]
        
        %% Step 2: Tectonic Deformation
        M2[2. Tectonic Deformation]
        note2[Stress Tensors: Uplift, Rift, Subduction]
        
        %% Step 3: Volcanism
        M3[3. Volcanic Systems]
        note3[Island Arcs, Hotspot Chains]
        
        %% Step 4: Structural Erosion
        M4[4. Structural Erosion]
        note4[Thermal Weathering, Talus Slopes]
        
        %% Step 5: Coastal
        M5[5. Coastal Refinement]
        note5[Shelves, Atolls, Landmask]
        
        M1 --> M2 --> M3 --> M4 --> M5
    end

    subgraph "Downstream"
        H_Hydro[Hydrology: Flow & Drainage]
        E_Eco[Ecology: Biomes]
        G_Game[Gameplay: Move Cost/Appeal]
    end

    F_Plates --> M1
    F_Vectors --> M2
    F_Mesh --> M1
    
    M5 --> H_Hydro
    M5 --> E_Eco
    M5 --> G_Game
2.2 Data Model: The Global HeightfieldThe primary internal state is a Float32Array representing normalized planetary radius/elevation.Resolution: 1:1 with the game grid (likely Voronoi dual cells or Hex centers).Unit Scale (Internal): Normalized [-1.0, 1.0].0.0: Canonical Sea Level.-1.0: Abyssal Trenches.+1.0: Highest Peaks (Everest equivalent).+0.1: Lowland Plains.-0.1: Continental Shelves.3. Functional Decomposition (The Physics Model)Stage 1: Base Topography (Isostasy & Shelves)Physics: Continental crust (granitic) creates "freeboard" relative to Oceanic crust (basaltic). Continental Shelves are submerged extensions of the continent.Operation: compute-base-topographyInputs: Foundation.CrustType (Enum: Continental, Oceanic, Transitional).Algorithm:Initialize height based on Crust Type:Oceanic: -0.6 (Abyssal Plain baseline).Continental: +0.05 (Lowland baseline).Shelf Generation: Apply a distance field from the Continent edge into the Ocean. Raise Ocean cells within ShelfWidth (config) to ~-0.15. This creates the shallow water zone critical for naval gameplay and marine resources.Stage 2: Tectonic Deformation (Vector Orogeny)Physics: Topography is driven by the relative velocity of adjacent plates.Operation: compute-tectonicsInputs: Foundation.PlateVelocity (Vector2), Foundation.PlateBoundaries.Algorithm:For every boundary edge, calculate Convergence Rate: $V_{rel} = (Vel_A - Vel_B) \cdot Normal_{AB}$.Case: Collision ($V_{rel} > Threshold$):Continent-Continent: Massive Uplift. Apply wide, high-amplitude "Ridge Noise" modulated by $V_{rel}$. (e.g., Himalayas).Ocean-Continent: Subduction. Uplift on Continental side (Andes), subsidence (Trench) on Ocean side.Case: Divergence ($V_{rel} < -Threshold$):Ocean-Ocean: Mid-Ocean Ridge (Local uplift relative to abyss, but rugged).Continent-Continent: Rift Valley. Apply negative height modifier, creating linear lakes/seas (e.g., East African Rift).Case: Shear/Transform:Add roughness (high frequency noise) but minimal height change.Stage 3: Volcanic SystemsPhysics: Magma generation via flux melting (subduction) or mantle plumes (hotspots).Operation: plan-volcanismInputs: Foundation.PlateBoundaries (Subduction), Config volcanism_density.Algorithm:Arc Volcanism: Identify Subduction boundaries. Place volcanic peak candidates on the overriding plate, offset by distance $D$ (simulating slab depth).Hotspot Volcanism:Scatter $N$ hotspots (seeds).Hotspot Trails: For each hotspot, trace a path backwards against the PlateVelocity.Result: A chain of features.Head: Active Volcano (High elevation).Tail: Dormant peaks -> Eroded Seamounts (Guyots).Crucial for generating island chains (Hawaii style) in the middle of oceanic plates.Stage 4: Structural Erosion (Thermal)Physics: Gravity acts on loose material. Talus slopes stabilize at the Angle of Repose (~30-40°).Operation: apply-structural-erosionDistinction: This is not Hydraulic Erosion (rain rivers). This is "dry" erosion that defines the age of the mountains.Algorithm:Iterative cellular automaton (Thermal Erosion).For each cell $C$, compare neighbors $N_i$.If $(Height_C - Height_{N_i}) > TalusThreshold$:Move fraction of height from $C$ to $N_i$.Effect: Sharp tectonic noise becomes jagged peaks (low erosion) or rounded hills (high erosion/old world).Stage 5: Coastal Refinement & LandmaskPhysics: The interface between land and sea is complex and fractal.Operation: refine-coastlinesInputs: SeaLevelOffset (Config).Algorithm:Apply SeaLevelOffset to global heightfield (e.g., +0.05 for "Low Sea Level" scenarios).Fractal Coast: Add micro-scale noise to cells within range of 0.0 to break up Voronoi linearity.Atoll Formation: Identify submerged volcanic peaks (Guyots) in tropical latitudes (Lat input from Foundation). If Height is within narrow "Coral Growth Zone", create ring-shaped land geometry.Derive Artifacts:Landmask: $Height > 0.0$.CoastlineDistance: Distance field (0 at coast, increasing inland/ocean).4. Configuration & SemanticsConfig follows the Knobs-Last pattern.4.1 Config Semantics TableKnob KeyTypeDefaultSemantic MeaningImplementation Detailsworld_ageEnumNORMALMacro for erosion/tectonics.NEW: High Uplift, Low Erosion. OLD: Low Uplift, High Erosion.sea_levelEnumNORMALGlobal water volume.Maps to sea_level_offset scalar (e.g., LOW = +0.1, HIGH = -0.1).orogeny_forceFloat1.0Strength of tectonic collision.Multiplier for the $V_{rel}$ impact on height.volcanism_freqFloat1.0Density of hotspots/arcs.Scaler for hotspot count and subduction sampling rate.erosion_rateFloat0.5Thermal weathering intensity.Determines iterations/transfer rate of the Talus automaton.continental_shelfFloat1.0Width of shallow water.Multiplier for the distance field extension in Stage 1.4.2 Locked DecisionsDeterminism: All noise lookups must use the Foundation seed + coordinate hashing. No Math.random().Knobs as Transforms: Knobs modify the inputs to the physics equations (e.g., stress * orogeny_force), they do not act as post-process filters (e.g., height * 1.5).5. Contract Definition (Public Surfaces)These artifacts represent the Tier A Public Contract of Morphology.// @package/morphology-api

export interface MorphologyArtifacts {
  /**
   * The canonical elevation of the world.
   * Normalized range: approx [-1.0, 1.0].
   * Sea Level is 0.0.
   */
  globalHeightmap: Float32Array;

  /**
   * The binary definition of land vs water.
   * 1 = Land, 0 = Water.
   * Derived strictly from globalHeightmap > 0.0.
   */
  landmask: Uint8Array;

  /**
   * Distance to the nearest land/water edge.
   * 0.0 = At coast.
   * Positive = Inland distance.
   * Negative = Ocean distance.
   */
  coastalDistance: Float32Array;

  /**
   * Sparse registry of significant physical features.
   * Used for naming and resource placement (e.g., Obsidian near volcanoes).
   */
  geoFeatures: Array<{
    cellIndex: number;
    type: 'VOLCANO_ACTIVE' | 'VOLCANO_DORMANT' | 'PEAK' | 'RIFT_VALLEY';
    magnitude: number;
  }>;
  
  /**
   * Derived roughness/slope for movement cost.
   * Calculated during the Erosion phase.
   */
  slopeMap: Float32Array;
}
6. Upstream & Downstream Dependencies6.1 Upstream Requests (to Foundation)To unlock this physics model, Foundation must provide:PlateVelocity (Vector2): Essential for determining Convergence vs Divergence.CrustType (Enum): Essential for Isostasy (Continental vs Oceanic base heights).AbsoluteLatitude (Float): Needed for Atoll formation logic (Coral growth zones).6.2 Downstream ChangesHydrology: Must accept globalHeightmap and run its own flow routing (A* descent). It can no longer rely on Morphology to tell it "Water flows SE".Ecology: Must accept globalHeightmap to calculate Adiabatic Lapse Rate (temperature drop). Must use coastalDistance for Continentality.Gameplay: Must derive PlotTypes (Hill/Mountain) from slopeMap and globalHeightmap thresholds, rather than expecting a pre-baked TerrainType array.Lookback 2Research Integration:Incorporated Plate Vectors (from SPIKE-earth-physics-systems-modeling-alt.md) to drive orogeny.Adopted Hotspot Trails logic for islands (from SPIKE-earth-physics-systems-modeling.md).Defined Isostatic base layers (Crust types) to ensure realistic Ocean vs Land distribution.Complexity Management: Separated Structural Erosion (Morphology) from Hydraulic Erosion (Hydrology) to break circular dependencies while maintaining visual fidelity.Game Design Alignment: Explicitly modeled Continental Shelves to support Civ7's naval gameplay requirements (referenced in SPIKE-civ7-map-generation-features.md regarding Navigable Rivers and coastal traversal).Overlay Elimination: Narrative control is now handled via sea_level_offset and input seeds, removing the need for legacy image overlays.