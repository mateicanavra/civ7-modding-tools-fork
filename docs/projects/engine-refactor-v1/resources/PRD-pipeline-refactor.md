# PRD: Map Generation Pipeline Refactor

## 1. Overview

This document defines the requirements for refactoring the `mapgen-core` engine from a monolithic script into a **Data-Driven Task Graph**. This is the foundational architectural shift required to support modular map scripts, robust testing, and future extensibility.

**Key Goals:**
1.  **Modularity:** Decompose the "God Class" (`MapOrchestrator`) into small, testable Strategies.
2.  **Configurability:** Enable map scripts to be defined as JSON recipes rather than imperative code.
3.  **Stability:** Eliminate "dumb fallbacks" and enforce strict dependency injection (Fail Fast).
4.  **Legacy Integration:** Provide a bridge for existing scripts while enforcing purity in new code.

---

## 2. Problem Statement

The current `MapOrchestrator` suffers from several critical flaws:
*   **Implicit Dependencies:** Stages read global state (`WorldModel`) without declaring it.
*   **Hardcoded Flow:** The execution order is baked into `runGeneration()`, making it impossible to reorder steps (e.g., "Erosion before Rivers") without rewriting the core.
*   **Silent Failures:** Missing dependencies (like the Adapter) trigger "fallback" mocks that produce valid-looking but empty maps.
*   **Untestable:** Testing a single stage (e.g., "Islands") requires booting the entire engine simulation.

---

## 3. Architecture: The Task Graph

We will implement the architecture defined in [`docs/system/libs/mapgen/architecture.md`](../../../system/libs/mapgen/architecture.md).

### 3.1. Core Components

1.  **MapGenStep (Interface):** The contract for all generation logic.
    *   Must declare `requires` and `provides` (dependency tags: data artifacts, fields, and/or engine-state guarantees).
    *   Must declare `phase` (architectural boundary).
    *   Must be stateless (except for configuration).
2.  **StepRegistry:** A plugin system to register steps by ID (e.g., `core.mesh.voronoi`).
3.  **MapGenContext:** The shared blackboard, split into `fields` (Canvas) and `artifacts` (Intermediate).
4.  **PipelineExecutor:** A generic runner that iterates through a JSON recipe, resolves steps from the Registry, and executes them.

### 3.2. Configuration (The Recipe)

The engine will be driven by a JSON configuration object.

```json
{
  "pipeline": [
    { "step": "core.setup.grid", "config": { "width": 84, "height": 54 } },
    { "step": "core.mesh.voronoi", "config": { "cellCount": 4000 } },
    { "step": "core.plates.weighted", "config": { "majorPlates": 3 } }
  ]
}
```

---

## 4. Requirements

### 4.1. Infrastructure
*   **REQ-INF-1:** Define `MapGenStep` interface with `id`, `phase`, `requires`, `provides`, and `run`.
*   **REQ-INF-2:** Implement `StepRegistry` to manage step instances.
*   **REQ-INF-3:** Define `MapGenContext` with strict separation of `fields` (mutable output) and `artifacts` (immutable intermediate data).
*   **REQ-INF-4:** Implement `PipelineExecutor` that validates dependencies (`requires` tags are satisfied in `context`) before running each step.

### 4.2. Integrity & Error Handling
*   **REQ-ERR-1 (Fail Fast):** If a required dependency is missing from the Context, the Executor must throw a `MissingDependencyError` immediately.
*   **REQ-ERR-2 (No Globals):** New steps must strictly use `MapGenContext`. Accessing the global `WorldModel` singleton is prohibited.
*   **REQ-ERR-3 (Strict Injection):** The `MapOrchestrator` must accept `Civ7Adapter` via constructor. If the adapter cannot be loaded, the application must crash (no silent mock fallback).

### 4.3. Legacy Bridge
*   **REQ-LEG-1:** The `MapOrchestrator` must act as a bridge. After the new pipeline runs, it must sync relevant data from `MapGenContext` to the legacy `WorldModel` singleton to support downstream legacy scripts.
*   **REQ-LEG-2:** Existing map scripts must continue to function by using a default "Standard Pipeline" configuration that mimics the current hardcoded flow.

---

## 5. Implementation Phases

> Note: Milestone ownership and timing for these phases is tracked in
> `PROJECT-engine-refactor-v1.md` and the corresponding milestone docs (for example
> `milestones/M2-stable-engine-slice.md`). This PRD only describes the technical
> phases; it does not assign them to specific calendar slices.

### Phase 1: Core Plumbing
*   Create `core/pipeline.ts` (Interfaces & Registry).
*   Update `core/types.ts` (Context definitions).
*   Refactor `MapOrchestrator` to accept a `PipelineConfig`.
*   Ensure `MapGenContext` is able to carry a validated `MapGenConfig` as defined in `PRD-config-refactor.md` (Phase 1), rather than relying on global config. The exact milestone where this wiring lands is defined in the engine-level PRD and milestone docs.

### Phase 2: Foundation Migration
*   Implement `Mesh`, `Partition`, and `Physics` steps as `MapGenStep`s.
*   (See `PRD-plate-generation.md` for details).

### Phase 3: Legacy Wrapper
*   Wrap existing legacy logic (Hydrology, Ecology) into "Shell Steps" (e.g., `LegacyHydrologyStep`) that simply call the old functions.
*   This allows the entire engine to run via the Pipeline Executor, even if the internals of some steps are still legacy.

---

## 6. Risks & Mitigations

*   **Risk:** Performance overhead of the generic Executor.
    *   *Mitigation:* The overhead of a loop and a few map lookups is negligible compared to the heavy math of Voronoi/Erosion.
*   **Risk:** "Air Gap" between JSON config and Step config types.
    *   *Mitigation:* Use the shared `MapGenConfig` schema (see `PRD-config-refactor.md`) to validate engine configuration at the entrypoint, and optionally layer additional per-step validation where needed.
*   **Risk:** Debugging complexity.
    *   *Mitigation:* The Executor should log "Starting Step X..." and "Finished Step X (15ms)" to provide a clear trace.

---

## 7. Dependencies

This PRD assumes the configuration system has been brought up to the Phase 1 “hygiene” standard described in `PRD-config-refactor.md`:

* A single validated `MapGenConfig` schema is available and used to construct `MapGenContext.config`.
* Global config stores and multi-stage deep-merge paths have been removed in favor of explicit injection at the engine boundary.

The pipeline refactor can be prototyped earlier, but full adoption of the Task Graph in production should be gated on completing Phase 1 of the config refactor to avoid carrying legacy configuration traps into the new architecture.
