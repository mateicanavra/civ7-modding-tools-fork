# Map Generation Engine Architecture

## 1. Core Philosophy

The Map Generation Engine is designed as a **Data-Driven Task Graph**. It moves away from monolithic "God Classes" (like the legacy `MapOrchestrator`) towards a composable pipeline of small, single-purpose **Strategies**.

**Key Patterns:**
*   **Pipeline Pattern:** The generation process is a linear (or branching) sequence of steps.
*   **Strategy Pattern:** Each step is an interchangeable unit of logic (e.g., "Voronoi Mesh" vs "Grid Mesh").
*   **Blackboard Pattern:** Steps communicate *only* by reading/writing to a shared `MapContext`.
*   **Registry Pattern:** Steps are looked up by ID, allowing mods to inject new logic without recompiling the core.

---

## 2. The Task Graph (Pipeline)

### 2.1. The Step Interface

```typescript
/**
 * A single unit of work in the map generation pipeline.
 */
export interface MapGenStep {
  /** Unique identifier for the registry (e.g., "core.mesh.voronoi") */
  id: string;

  /** Data required in the Context before this step can run */
  requires: string[]; // e.g., ["dimensions"]

  /** Data this step promises to add to the Context */
  provides: string[]; // e.g., ["mesh"]

  /**
   * Execute the logic.
   * @param context The shared blackboard (mutable).
   * @param config Step-specific configuration from JSON.
   */
  run(context: MapContext, config: Record<string, unknown>): Promise<void>;
}
```

### 2.2. The Registry

The `StepRegistry` acts as the plugin system. Core steps are registered by default, but mods can register new steps at runtime.

```typescript
// System initialization
const registry = new StepRegistry();
registry.register(new VoronoiMeshStep());
registry.register(new GridMeshStep());
registry.register(new HydraulicErosionStep());
```

### 2.3. Configuration (The Recipe)

The map script is no longer code; it is a JSON recipe. This allows the UI to manipulate the pipeline without touching TypeScript.

```json
{
  "pipeline": [
    {
      "step": "core.mesh.voronoi",
      "config": { "cellCount": 4000, "relaxation": 3 }
    },
    {
      "step": "core.plates.weighted",
      "config": { "majorPlates": 3, "minorPlates": 12 }
    },
    {
      "step": "core.tectonics.standard",
      "config": { "collisionScale": 0.8 }
    }
  ]
}
```

---

## 3. Data Flow & The Blackboard

To prevent "spaghetti code" where steps depend on internal details of other steps, all communication happens via the **Extended Map Context**.

### 3.1. The Context Structure

The context is divided into "Domains" to organize data.

```typescript
interface ExtendedMapContext {
  // 1. Global Metadata
  dimensions: MapDimensions;
  rng: RNGState;

  // 2. The "Board" (Graph representations)
  mesh?: RegionMesh;
  graph?: PlateGraph;

  // 3. The "Simulation" (Physics tensors)
  foundation?: FoundationContext; // Tectonics, Wind, Pressure

  // 4. The "Output" (Game Engine buffers)
  fields: MapFields; // Elevation, TerrainType, FeatureType
}
```

### 3.2. Side-Effect Isolation

*   **Internal Purity:** Steps should calculate their results using internal, pure logic (e.g., `MeshBuilder.create()`).
*   **Explicit Commit:** Only at the very end of `run()` should a step mutate the `context`.
*   **No Hidden State:** Steps must not rely on global variables or singletons (other than the provided `context.rng`).

---

## 4. Fractal Architecture: The Foundation Stage

The "Foundation" stage serves as the primary example of this architecture applied at a granular level. It is not a monolithic function but a **Sub-Pipeline**.

### 4.1. Decomposition

The Foundation stage is composed of three atomic strategies:

1.  **Mesh Strategy:** Generates the geometry.
    *   *Standard:* `d3-delaunay` Voronoi.
    *   *Alternative:* Hex-grid or Square-grid mesh.
2.  **Partition Strategy:** Groups mesh cells into plates.
    *   *Standard:* Weighted flood-fill (Major/Minor plates).
    *   *Alternative:* Random clusters or Perlin noise thresholding.
3.  **Physics Strategy:** Simulates interactions on plate boundaries.
    *   *Standard:* Vector-based collision/shear.
    *   *Alternative:* Simple distance-based mountains.

### 4.2. Example Flow

1.  **Orchestrator** reads config: `[Mesh, Partition, Physics]`.
2.  **Mesh Step** runs:
    *   Reads `dimensions`.
    *   Computes Voronoi.
    *   Writes `context.mesh`.
3.  **Partition Step** runs:
    *   Reads `context.mesh`.
    *   Computes clusters.
    *   Writes `context.graph`.
4.  **Physics Step** runs:
    *   Reads `context.graph`.
    *   Simulates forces.
    *   Writes `context.foundation` (Stress, Uplift).

---

## 5. Extensibility & Modding

This architecture enables three levels of modding:

1.  **Config Modding:** Tweaking values in the JSON recipe (e.g., changing `majorPlates` from 3 to 10).
2.  **Pipeline Modding:** Reordering or adding existing steps (e.g., inserting an "Erosion" step after "Physics").
3.  **Logic Modding:** Writing a new TypeScript class implementing `MapGenStep` and registering it (e.g., implementing a "Tectonic Plate Erosion" algorithm).

## 6. Implementation Roadmap

1.  **Define Interfaces:** Create `core/pipeline.ts` with `MapGenStep` and `StepRegistry`.
2.  **Refactor Foundation:** Implement `MeshStep`, `PartitionStep`, and `PhysicsStep` as the first concrete strategies.
3.  **Update Orchestrator:** Replace the hardcoded `runGeneration()` loop with a dynamic pipeline executor.
4.  **Migrate Config:** Convert existing `PlateConfig` presets into the new JSON pipeline format.
```
</file_content>
