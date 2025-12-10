# Civ 7 Map Generation: Foundation Stage Analysis

## 1. Re-anchoring: Physics in the Context of Civilization VII

In a simulation game, we simulate for fidelity. In Civilization, we simulate for Game Theory. The Foundation stage must produce specific “Masks” or “Heatmaps” that downstream stages (Morphology, Biomes) use to place game objects.

### Mapping Tectonics to Civ 7 Gameplay

The physics engine should not output “height”; it should output “potential.”

| Tectonic Force          | Geologic Result         | Civ 7 Game Object                                                                 |
|-------------------------|-------------------------|------------------------------------------------------------------------------------|
| Ocean-Cont Convergence  | Subduction Zone         | Mountain Ranges (Coastal), Volcanoes (Disasters), Geothermal Fissures (Power/Amenities) |
| Cont-Cont Convergence   | Orogeny / Fold Belts    | Mountains (Inland, thick), Plateaus (Hills), Passable Terrain (Valleys)           |
| Divergence (Land)       | Rift Valley             | Lakes, Rivers (Origins), Floodplains (lowlands)                                    |
| Divergence (Ocean)      | Mid-Ocean Ridge         | Ocean (Deep), Islands (occasional)                                                  |
| Transform Faults        | Shear Stress            | Hills (Rough terrain), Earthquake Risks (Hidden mechanic?)                         |
| Intra-plate Hotspots    | Mantle Plume            | Natural Wonders, Atolls, Island Chains (Hawaii style)                              |

## 2. Evaluation of Current Foundation Design

### 2.1. Realism & Coverage Gaps

Your current design focuses heavily on Vector Analysis (Velocity, Normal, Convergence). This is excellent for 60% of cases but misses critical drivers of Civ map geography.

#### Gap 1: Crustal Differentiation (Continental vs. Oceanic) [CRITICAL]

- **Current State:** Plates have ID and Velocity.
- **The Problem:** In the real world, “Land” sits on top of “Continental Crust.” When two plates hit, the winner is determined by density.
  - Ocean (Heavy) hits Continent (Light): Ocean goes down. Result: Coastal Mountains (Andes).
  - Continent hits Continent: Neither goes down. Result: Massive Inland Mountains (Himalayas).
- **Civ 7 Impact:** Without tracking which parts of a plate are “Continental Crust” vs “Oceanic Crust,” you cannot distinguish between generating a Volcano (Coastal) and a Passable Hill Range (Inland).
- **Recommendation:** Add a CrustType or Density property to the Plate (or the mesh cells within the plate).

#### Gap 2: Cratons vs. Accretion

- **Current State:** Land masses are generated as a step.
- **The Problem:** Real continents have “Cratons” (ancient, flat, stable cores) and “Orogens” (crumpled edges).
- **Civ 7 Impact:** Flatland is essential for farming/cities. If you rely purely on plate boundary physics, your map will be all Mountains/Hills (edges) and Ocean, with no stable flatland in the middle.
- **Recommendation:** The Foundation phase must seed Cratons—zones of zero tectonic activity—to ensure there is playable flat space.

#### Gap 3: Hotspots (Mantle Plumes)

- **Current State:** Focuses on boundaries.
- **The Problem:** Many islands and wonders occur inside plates (Hawaii, Yellowstone).
- **Civ 7 Impact:** Essential for Natural Wonders and navigable Island Chains in the deep ocean (vital for naval stepping stones).
- **Recommendation:** Add a HotspotStrategy that drops random “heat points” that ignore plate boundaries and output UpliftPotential purely based on position.

### 2.2. Output Data Structures

Your current outputs (upliftPotential, riftPotential) are good, but insufficient for a rich Civ 7 map.

**Missing Artifacts:**

- **FractureMap:** A measure of how broken the crust is. High fracture + Low Elevation = Rivers and Coastlines. Low fracture = Smooth coastline.
- **VolcanismMask:** Distinct from Uplift. High Uplift might just be a hill. High Volcanism means a Volcano feature. This is determined by Subduction (Convergence + Oceanic Crust) or Hotspots.
- **AgeMap:** (See Section 3). Needed to determine if a mountain is an impassable peak (Young) or a mineable hill (Old).

## 3. Time Evolution: The “Geological Era” Approach

You asked if the Foundation stage should support dynamic iterations. Yes, but not as a continuous simulation.

Simulating 4 billion years of movement is unstable and hard to control for gameplay balance. Instead, use Iterative Composition (Stacking).

### Recommended Architecture: The “Two-Pass” System

Instead of one physics pass, run the Foundation logic twice with different parameters and “bake” the results into layers.

#### Pass 1: The Paleo-Era (Ancient)

- **Logic:** Large plates, slow movement.
- **Output:** “Paleo-Uplift.”
- **Morphology Interpretation:**
  - High Paleo-Uplift = Hills (Eroded mountains).
  - Resources = Coal, Iron (Ancient deposits).
  - Shape = Rounded, accessible.

#### Pass 2: The Cenozoic-Era (Modern)

- **Logic:** Smaller plates, fast movement.
- **Output:** “Neo-Uplift.”
- **Morphology Interpretation:**
  - High Neo-Uplift = Impassable Mountains.
  - Resources = Geothermal, Uranium.
  - Features = Volcanoes.
  - Shape = Jagged, linear ranges.

### Implementation Strategy

Modify your MapGenContext to store layers:

```ts
interface TectonicArtifacts {
    // ... existing
    paleoUplift: Float32Array; // 0.0 - 1.0
    neoUplift: Float32Array;   // 0.0 - 1.0
    volcanism: Float32Array;   // 0.0 - 1.0
    crustAge: Float32Array;    // 0.0 (New) - 1.0 (Ancient)
}
```

**Benefits:**

- Allows distinct gameplay zones (Old World hills vs. New World peaks).
- Solves the “Erosion” problem without expensive fluid simulation—just map “Old Uplift” to “Eroded Terrain.”

## 4. Integration with Civ 7 Code (civ7-official-repomix.xml)

Reviewing the provided XML/Codebase reveals specific constraints:

### LandmassRegion vs PlateRegion

- **Insight:** The code treats Landmasses and Plates as separate Voronoi regions.
- **Action:** Your Partition Strategy needs to assign LandmassID to cells based on the CrustType logic mentioned in 2.1.

### ScoringContext

- **Insight:** The game uses a rule-based scorer (scoreCell).
- **Action:** Your Foundation stage should output normalized scores (0.0-1.0) for TectonicStress, Volcanism, etc., so they can be easily plugged into these Rule classes later.

### QuadTree usage

- **Insight:** The code utilizes QuadTrees for spatial lookups.
- **Action:** Ensure your Mesh generation (d3-delaunay) remains compatible or can be easily indexed into a QuadTree for the game's unit placement logic later.

## 5. Summary of Recommended Changes

- **Add CrustType to Cells/Plates:** Distinguish Oceanic vs. Continental to solve the Subduction/Collision logic.
- **Implement “Craton Seeding”:** Don’t just simulate edges; explicitly place stable cores to ensure playable flatlands.
- **Adopt “Layered Orogeny”:** Run the physics loop twice (Ancient vs. Modern) to differentiate Hills (Old) from Mountains (New).
- **Add HotspotStrategy:** Simple RNG points that add uplift/volcanism independent of plates.
