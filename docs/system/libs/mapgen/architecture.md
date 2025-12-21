# Map Generation Engine Architecture

> This document describes the **target** architecture for the MAPS engine.

## Status (Target vs Current)

This page intentionally mixes:

- **Target architecture (canonical):** the Task Graph / `MapGenStep` / `StepRegistry` direction we are steering toward.
- **Current implementation (post‑M2, transient):** the orchestrator‑centric stable slice used today while M3/M4 land.

Config note (important):
- Some older sections still refer to a monolithic `MapGenConfig` object in `context.config`.
- The current target drafts supersede that: boundary input is `RunRequest = { recipe, settings }`, and step-local knobs are validated per step (no global config mega-object). See `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`.

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
   * Execute the logic.
   * @param context The shared blackboard (mutable).
   */
  run(context: MapGenContext): void | Promise<void>;
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

### 2.5. Configuration Schema (Current: `MapGenConfig`; Target: step-owned config)

Current (M3): in addition to the pipeline ordering inputs, the engine is driven by a strongly-typed, runtime‑validated **configuration object** (`MapGenConfig`) that is injected into the context:

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
- The schema is **strict**: unknown keys are rejected. Experimental/plugin-owned knobs must live under `config.extensions` (or be modeled into the schema).
- The engine entrypoint (e.g., `MapOrchestrator` or a pipeline runner) is responsible for:
  - Accepting raw config from the map script.
  - Validating it once at startup via the schema.
  - Injecting the resulting `MapGenConfig` into `MapGenContext.config`.

Relationship to the recipe:

- Current (M3): `MapGenConfig` covers **parameters** (plate counts, landmass water %, tuning, diagnostics, etc.) while ordering/enablement are still transitional (`STAGE_ORDER` + `stageManifest`; DEF-004).
- Target: there is **no** `context.config` mega-object. Boundary input is:
  - `RunRequest = { recipe, settings }`
  - `settings` are narrow, per-run globals (seed + dimensions at minimum) at `context.settings`
  - step-local knobs are validated per-step and supplied via per-occurrence recipe config

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
- **Effects (`effect:*`)** — guarantees about **engine-surface effects** performed through the `EngineAdapter` (examples: `effect:engine.riversModeled`, `effect:engine.biomesApplied`, `effect:engine.placementApplied`).

This keeps M3 wrap-first steps honest: steps like placement can be contract-checked at runtime even when they primarily consume engine-surface state, while still allowing us to progressively migrate more information into explicit artifacts over time.

> Current (M3): a transitional `state:engine.*` namespace exists for wrap-first steps (see `docs/projects/engine-refactor-v1/deferrals.md` DEF-008). The target contract is `effect:*` with runtime verification; `state:engine.*` is not a permanent namespace.

##### Engine Boundary Policy (Accepted)

The mapgen pipeline treats the Civ engine as an **I/O surface** behind `EngineAdapter`, not as the pipeline’s “memory”.

**Hard rules**
- **Adapter-only:** steps must not touch engine globals (e.g., `TerrainBuilder`, `GameplayMap`) directly; all engine reads/writes go through `context.adapter`.
- **Fail-fast:** there is no “silent guard” category; missing prerequisites fail as validation errors (when knowable) or loud runtime failures that stop execution.
- **Effects schedule:** `effect:*` tags are first-class dependency tags and participate in scheduling via `requires`/`provides`.

**Reification-first (target best practice)**
- **Pipeline state is canonical in `field:*` / `artifact:*`.** If a step reads engine state that is used beyond the step, it must publish the corresponding `field:*` / `artifact:*` onto the context (“reify”).
- **Engine mutations must be reflected back.** If a step mutates the engine and later steps depend on those results, the step must either:
  - compute/carry the authoritative data in TS first and publish to engine as a pure “publish” step, or
  - run the engine mutation and then reify the relevant results back into `field:*` / `artifact:*` (often as a separate “reify” step).
- **Downstream steps should depend on reified tags.** Cross-step dependencies should be expressed in terms of `field:*` / `artifact:*` wherever reasonable; `effect:*` encodes “engine effects happened” ordering and adapter capability/invariant constraints.

**Verification (no “asserted but unverified” effects)**
- Any `effect:*` tag used for scheduling must be runtime-verifiable (typically via `EngineAdapter` queries). A step that `provides effect:*` must be verifiable immediately after it runs (postcondition checks).

**Escape hatch (rare, transitional)**
- During migration, some steps may remain “engine-first” for correctness/parity (e.g., calling Civ scripts that compute results internally).
- This is allowed only as a transitional posture: any engine-derived data needed later must still be reified into `field:*` / `artifact:*` as soon as practical, and schedulable effects must remain verifiable. The target standard library should not depend on opaque engine state as an implicit cross-step contract.

##### `provides` Is Aggregated (Not Per-Step “Outputs”)

The executor treats dependency tags as a monotonic “satisfied set”: once a tag is satisfied, it remains satisfied for the remainder of the run. This is the intended “aggregation” mechanism—downstream steps do **not** need to re-`provide` tags that were already provided upstream.

As a rule:

- A step should list a tag in `provides` only if it **materializes** that tag (publishes a concrete value onto the context) or intentionally **refreshes** it after mutation.
- Consumer steps should not “re-provide” tags they merely read. If a step is not the publisher/refresher, it should just `require` the tag.

For derived snapshot artifacts (notably `artifact:heightfield`), this means:

- Publishing is explicit: call `syncHeightfield(ctx)` (populate buffers from the engine surface) and then `publishHeightfieldArtifact(ctx)` (store the snapshot under `ctx.artifacts`).
- If a step claims `provides: ["artifact:heightfield"]`, it must actually perform that publication; TaskGraph will validate the postcondition.

### 4.2. No Global State
*   The legacy `WorldModel` singleton is **banned** in new code.
*   New steps must read/write strictly to `context.artifacts` or `context.fields`.

### 4.3. Legacy Bridge Retired
The temporary bridge that copied data into the global `WorldModel` has been removed. The foundation stage now produces `context.foundation`, and downstream steps consume that artifact directly.

Legacy support is still handled at the step boundary; we no longer synchronize to `WorldModel` in the runtime pipeline.

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
