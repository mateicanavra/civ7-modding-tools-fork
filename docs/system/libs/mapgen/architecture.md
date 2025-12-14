# Map Generation Engine Architecture

> This document describes the **target** architecture for the MAPS engine.

## Status (Target vs Current)

This page intentionally mixes:

- **Target architecture (canonical):** the Task Graph / `MapGenStep` / `StepRegistry` direction we are steering toward.
- **Current implementation (post‑M2, transient):** the orchestrator‑centric stable slice used today while M3/M4 land.

When you need “what’s actually wired right now,” prefer the project snapshot docs:

- `docs/projects/engine-refactor-v1/status.md`
- `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`
- `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md`
- `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`

**Important:** `PipelineExecutor` / the generic step registry are **target**, not universally present in the current codebase yet.

## 1. Core Philosophy

The Map Generation Engine is designed as a **Data-Driven Task Graph**. It moves away from monolithic "God Classes" (like the legacy `MapOrchestrator`) towards a composable pipeline of small, single-purpose **Strategies**.

**Key Patterns:**
*   **Pipeline Pattern:** The generation process is a linear (or branching) sequence of steps, organized into architectural **Phases**.
*   **Strategy Pattern:** Each step is an interchangeable unit of logic (e.g., "Voronoi Mesh" vs "Grid Mesh").
*   **Blackboard Pattern:** Steps communicate *only* by reading/writing to a shared `MapGenContext`.
*   **Registry Pattern:** Steps are looked up by ID, allowing mods to inject new logic without recompiling the core.

---

## 2. The Task Graph (Pipeline)

### 2.1. Architectural Phases

To ensure structural integrity, the pipeline is divided into strict phases. Steps within a phase can be reordered (if dependencies allow), but phases themselves execute sequentially.

```typescript
export type GenerationPhase =
  | "setup"       // Infrastructure initialization
  | "foundation"  // Tectonic plates, basic physics
  | "morphology"  // Elevation, landmass shape
  | "hydrology"   // Rivers, lakes, moisture
  | "ecology"     // Biomes, features, resources
  | "placement";  // Civilizations, units
```

### 2.2. The Step Interface

```typescript
/**
 * A single unit of work in the map generation pipeline.
 */
export interface MapGenStep {
  /** Unique identifier for the registry (e.g., "core.mesh.voronoi") */
  id: string;

  /** The architectural phase this step belongs to */
  phase: GenerationPhase;

  /** Data required in the Context before this step can run */
  requires: string[]; // e.g., ["dimensions"]

  /** Data this step promises to add to the Context */
  provides: string[]; // e.g., ["mesh"]

  /**
   * Optional dynamic check to skip this step based on context state.
   * e.g. Skip river generation if map has no water.
   */
  shouldRun?: (context: MapGenContext, config: any) => boolean;

  /**
   * Execute the logic.
   * @param context The shared blackboard (mutable).
   * @param config Step-specific configuration from JSON.
   */
  run(context: MapGenContext, config: Record<string, unknown>): Promise<void>;
}
```

### 2.3. The Registry

The `StepRegistry` acts as the plugin system. Core steps are registered by default, but mods can register new steps at runtime.

```typescript
// System initialization
const registry = new StepRegistry();
registry.register(new VoronoiMeshStep());
registry.register(new GridMeshStep());
```

### 2.4. Configuration (The Recipe)

The map script is defined by a JSON recipe. This allows the UI to manipulate the pipeline without touching TypeScript.

> Current (M3): execution order is still derived from legacy `STAGE_ORDER` + `stageManifest` enable/disable flags; arbitrary recipe composition is intentionally deferred (see `docs/projects/engine-refactor-v1/deferrals.md` DEF-004).

```json
{
  "pipeline": [
    {
      "step": "core.mesh.voronoi",
      "config": { "cellCount": 4000 }
    },
    {
      "step": "core.plates.weighted",
      "config": { "majorPlates": 3 }
    }
  ]
}
```

### 2.5. Configuration Schema (MapGenConfig)

In addition to the pipeline recipe, the engine is driven by a strongly-typed, runtime‑validated **configuration object**:

```typescript
export interface MapGenContext {
  // --- Infrastructure ---
  adapter: EngineAdapter;
  config: MapGenConfig;
  dimensions: MapDimensions;
  rng: RNGState;
  // ...
}
```

Key points:

- `MapGenConfig` is defined once via a schema in the engine (see `PRD-config-refactor.md` and `SPIKE-config-refactor-design.md`).
- The schema is implemented with a JSON‑Schema‑compatible library and used to:
  - Apply defaults and type coercions.
  - Validate incoming configs at the engine boundary (fail fast on invalid input).
  - Export JSON Schema for documentation and tooling.
- The engine entrypoint (e.g., `MapOrchestrator` or a pipeline runner) is responsible for:
  - Accepting raw config from the map script.
  - Validating it once at startup via the schema.
  - Injecting the resulting `MapGenConfig` into `MapGenContext.config`.

Relationship to the recipe:

- `MapGenConfig` covers **parameters** (plate counts, landmass water %, mountains/volcano/climate tuning, diagnostics, etc.).
- The recipe covers **which steps run and in what order** (and may provide per‑step overrides via the `config` field).
- Steps read configuration either directly from `context.config` or from a combination of `context.config` and their recipe‑level `config`, depending on their design.

---

## 3. Data Flow & The Blackboard

To prevent "spaghetti code" where steps depend on internal details of other steps, all communication happens via the **MapGenContext**.

### 3.1. The Context Structure

The context is explicitly divided into **Infrastructure**, **Canvas** (Mutable Output), and **Artifacts** (Intermediate Data) to clarify provenance.

```typescript
export interface MapGenContext {
  // --- Infrastructure ---
  adapter: EngineAdapter; // Injected via constructor (Strict Injection)
  config: MapGenConfig;
  dimensions: MapDimensions;
  rng: RNGState;

  // --- The Canvas (Mutable Output) ---
  // "What the map looks like right now" - Flushed to engine at the end.
  fields: {
    elevation: Int16Array;
    terrain: Uint8Array;
    biomes: Uint8Array;
    features: Int16Array;
    rainfall: Uint8Array;
  };

  // --- The Artifacts (Intermediate Data) ---
  // "The math behind the map" - Owned by specific phases.
  artifacts: {
    // Foundation Phase
    mesh?: RegionMesh;
    plateGraph?: PlateGraph;
    tectonics?: TectonicData;

    // Hydrology Phase
    riverGraph?: RiverGraph;

    // Ecology Phase
    // ...
  };
}
```

### 3.2. Side-Effect Isolation

*   **Internal Purity:** Steps should calculate their results using internal, pure logic (e.g., `MeshBuilder.create()`).
*   **Explicit Commit:** Only at the very end of `run()` should a step mutate the `context`.
*   **No Hidden State:** Steps must not rely on global variables or singletons (other than the provided `context.rng`).

---

## 4. System Integrity & Legacy Integration

### 4.1. Fail Fast Policy
We adopt a strict "Fail Fast" policy to prevent silent failures:
*   **No Mock Adapters:** If the game engine adapter (`@civ7/adapter`) cannot be loaded, the system throws a critical error. We do not fallback to a "Null Adapter" in production.
*   **Dependency Validation:** The Pipeline Executor validates that all `requires` are satisfied before running a step. If missing, it throws `MissingDependencyError`.

#### Dependency Tags (`requires` / `provides`)

`requires`/`provides` values are **dependency tags**: they are *not* limited to “in-memory artifacts”.

In this codebase we use them for three distinct classes of guarantees:

- **Artifacts (`artifact:*`)** — canonical in-memory data products published onto the context (examples: `artifact:foundation`, `artifact:heightfield`, `artifact:climateField`, `artifact:storyOverlays`).
- **Fields (`field:*`)** — mutable canvas buffers on the context that represent “what the map looks like right now” (examples: `field:terrainType`, `field:elevation`, `field:rainfall`).
- **Engine state (`state:*`)** — guarantees about **engine-surface effects** performed through the `EngineAdapter` (examples: `state:engine.riversModeled`, `state:engine.biomesApplied`, `state:engine.placementApplied`).

This keeps M3 wrap-first steps honest: steps like placement can be contract-checked at runtime even when they primarily consume engine-surface state, while still allowing us to progressively migrate more information into explicit artifacts over time.

### 4.2. No Global State
*   The legacy `WorldModel` singleton is **banned** in new code.
*   New steps must read/write strictly to `context.artifacts` or `context.fields`.

### 4.3. The Bridge Strategy
To support legacy scripts that haven't been refactored yet, the `MapOrchestrator` acts as a bridge:
1.  **Run Pipeline:** The new pipeline executes, populating `context.artifacts`.
2.  **Sync Legacy:** The Orchestrator copies relevant data from `context.artifacts` into the global `WorldModel` singleton.
3.  **Run Legacy:** Downstream legacy scripts execute, reading from the global `WorldModel`.

This isolates the technical debt to the Orchestrator boundary and allows us to refactor stages one by one.

This bridge is an intentional, time-bound compatibility tradeoff for Engine Refactor v1 (tracked in `docs/projects/engine-refactor-v1/deferrals.md` DEF-007).

---

## 5. Fractal Architecture: The Foundation Stage Example

The "Foundation" stage serves as the primary example of this architecture applied at a granular level. It demonstrates how a high-level phase is composed of atomic strategies.

### 5.1. Decomposition

The Foundation phase is not a single function but a **Sub-Pipeline** of three strategies:

1.  **Mesh Strategy:** Generates the geometry (e.g., Voronoi).
2.  **Partition Strategy:** Groups mesh cells into plates (e.g., Weighted Flood Fill).
3.  **Physics Strategy:** Simulates interactions on plate boundaries (e.g., Vector Collision).

### 5.2. Data Flow Example

1.  **Mesh Step:** Reads `dimensions` -> Writes `context.artifacts.mesh`.
2.  **Partition Step:** Reads `mesh` -> Writes `context.artifacts.plateGraph`.
3.  **Physics Step:** Reads `plateGraph` -> Writes `context.artifacts.tectonics`.

This modularity allows us to swap the "Partition Strategy" (e.g., to a "Random Cluster" strategy) without changing the Mesh or Physics logic.

---

## 6. Extensibility & Modding

This architecture enables three levels of modding:

1.  **Config Modding:** Tweaking values in the JSON recipe (e.g., changing `majorPlates` from 3 to 10).
2.  **Pipeline Modding:** Reordering or adding existing steps (e.g., inserting an "Erosion" step after "Physics").
3.  **Logic Modding:** Writing a new TypeScript class implementing `MapGenStep` and registering it (e.g., implementing a "Tectonic Plate Erosion" algorithm).
