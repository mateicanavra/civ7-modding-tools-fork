# PRD: Map Generation Pipeline Refactor

## 1. Overview

This document defines the requirements for refactoring the `mapgen-core` engine from a monolithic script into a **Data-Driven Task Graph**. This is the foundational architectural shift required to support modular map scripts, robust testing, and future extensibility.

**Key Goals:**
1.  **Modularity:** Decompose the "God Class" (`MapOrchestrator`) into small, testable Strategies.
2.  **Configurability:** Enable map scripts to be defined as JSON recipes rather than imperative code.
3.  **Stability:** Eliminate "dumb fallbacks" and enforce strict dependency injection (Fail Fast).
4.  **Migration with deletion:** Migrate safely, but leave **no legacy paths or compatibility contracts** at the end of M4.

**Update (2025-12-22, M4 planning):**
- Canonical boundary is `RunRequest = { recipe, settings }` compiled to an `ExecutionPlan` (executor runs the plan only).
- "Standard pipeline" is a first-class mod package (registry + recipe), not hard-wired code.
- Legacy ordering/enablement/config inputs (`STAGE_ORDER`, `stageManifest`, `stageConfig`, `shouldRun`, presets) are deletion-only and do not survive M4.
- Canonical references: `SPEC-target-architecture-draft.md` and `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

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
2.  **Registry (mod-instantiated):** A mod package provides a registry of steps/artifacts/fields/effects by ID.
3.  **MapGenContext:** The shared blackboard, split into `fields` (Canvas) and `artifacts` (Intermediate).
4.  **Compiler + Executor:**
    *   A compiler validates `RunRequest = { recipe, settings }` against the instantiated registry and produces an `ExecutionPlan` (resolved steps + resolved per-step config + normalized tags).
    *   The executor runs the `ExecutionPlan` only (single orchestration path), enforcing `requires` and verifying `provides` / `effect:*` guarantees as defined by the target architecture.

### 3.2. Configuration (The Recipe)

The engine will be driven by an authored recipe (step list + per-step config). The canonical boundary bundles this with validated run settings as `RunRequest = { recipe, settings }`.

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
*   **REQ-INF-2:** Implement a mod-instantiated Registry to manage step entries (and tag catalog metadata).
*   **REQ-INF-3:** Define `MapGenContext` with strict separation of `fields` (mutable output) and `artifacts` (immutable intermediate data).
*   **REQ-INF-4:** Implement `ExecutionPlan` compilation and execution:
    *   Compile: validate recipe + per-step config against the registry (unknown IDs/tags/config are errors).
    *   Execute: run the compiled plan nodes only and validate `requires`/`provides`/`effect:*` guarantees.

### 4.2. Integrity & Error Handling
*   **REQ-ERR-1 (Fail Fast):** If a required dependency is missing from the Context, the Executor must throw a `MissingDependencyError` immediately.
*   **REQ-ERR-2 (No Globals):** New steps must strictly use `MapGenContext`. Accessing the global `WorldModel` singleton is prohibited.
*   **REQ-ERR-3 (Strict Injection):** The runtime boundary must accept the `Civ7Adapter` explicitly. If the adapter cannot be loaded, the application must crash (no silent mock fallback).

### 4.3. Migration Posture (No Legacy Left)
*   **REQ-MIG-1:** Migration work may use internal shims during cutover, but **no legacy/compatibility entrypoints or contracts survive M4**.
*   **REQ-MIG-2:** The default "standard pipeline" is expressed as a mod package (registry + default recipe) and runs through the `RunRequest → ExecutionPlan` path.

~~REQ-LEG-1/2 (Legacy bridge + WorldModel sync)~~ are **superseded**.
**Update (2025-12-22, M4 planning):** M4 explicitly removes dual orchestration and legacy ordering/enablement/config inputs; "sync to WorldModel for legacy scripts" is not a target requirement. See `SPEC-target-architecture-draft.md` and `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

---

## 5. Implementation Phases

> Note: Milestone ownership and timing for these phases is tracked in
> `PROJECT-engine-refactor-v1.md` and the corresponding milestone docs (for example
> `milestones/M2-stable-engine-slice.md`). This PRD only describes the technical
> phases; it does not assign them to specific calendar slices.

### Phase 1: Core Plumbing
*   Define the boundary types: `RunRequest = { recipe, settings }` and compiled `ExecutionPlan`.
*   Implement compiler skeleton + executor entrypoints (single plan-driven runtime path).
*   Establish mod-instantiated registry as the catalog for steps/tags/config schemas.
*   Ensure the runtime has validated run settings (currently `MapGenConfig`) injected at the boundary (no globals).

### Phase 2: Foundation Migration
*   Implement `Mesh`, `Partition`, and `Physics` steps as `MapGenStep`s.
*   (See `PRD-plate-generation.md` for details).

### Phase 3: Cutover + Deletion
*   Express the standard pipeline as a mod package + default recipe and run it end-to-end via `RunRequest → ExecutionPlan`.
*   Delete legacy ordering/enablement/config surfaces and remove dual orchestration paths.

---

## 6. Risks & Mitigations

*   **Risk:** Performance overhead of the generic Executor.
    *   *Mitigation:* The overhead of a loop and a few map lookups is negligible compared to the heavy math of Voronoi/Erosion.
*   **Risk:** "Air Gap" between recipe config and step config types.
    *   *Mitigation:* Validate run settings at the boundary (see `PRD-config-refactor.md`) and validate per-step config at compile-time using registry-provided config schemas.
*   **Risk:** Debugging complexity.
    *   *Mitigation:* The Executor should log "Starting Step X..." and "Finished Step X (15ms)" to provide a clear trace.

---

## 7. Dependencies

This PRD assumes the configuration system has been brought up to the Phase 1 “hygiene” standard described in `PRD-config-refactor.md`:

* A single validated run-settings schema is available (currently `MapGenConfig`) and is injected at the boundary (`RunRequest.settings`).
* Global config stores and multi-stage deep-merge paths have been removed in favor of explicit injection at the engine boundary.

The pipeline refactor can be prototyped earlier, but full adoption of the Task Graph in production should be gated on completing Phase 1 of the config refactor to avoid carrying legacy configuration traps into the new architecture.
