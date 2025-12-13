---
id: LOCAL-M3-TASK-GRAPH-MVP
title: "[M3] Task Graph MVP: Pipeline Primitives + Standard Entry"
state: planned
priority: 1
estimate: 5
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Pipeline]
parent: null
children: []
blocked_by: []
blocked: [LOCAL-M3-HYDROLOGY-PRODUCTS, LOCAL-M3-STORY-SYSTEM, LOCAL-M3-BIOMES-FEATURES-WRAPPER, LOCAL-M3-PLACEMENT-WRAPPER, LOCAL-M3-CONFIG-EVOLUTION, LOCAL-M3-ADAPTER-COLLAPSE]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Implement the core Task Graph infrastructure (`MapGenStep`, `StepRegistry`, `PipelineExecutor`) and establish a "standard pipeline entry" that can run map generation end-to-end via explicit step contracts. This is the foundational unlock for all M3 work—Stacks 2–7 depend on this plumbing being in place.

## Context & Motivation

M2 delivers a stable foundation/plate slice running through `MapOrchestrator`, but this is orchestrator-centric, not Task Graph-driven. The current architecture has several limitations:

- **Implicit dependencies:** Stages read global state (`WorldModel`) without declaring requirements
- **Hardcoded flow:** Execution order is baked into `runGeneration()`, making reordering impossible
- **Silent failures:** Missing dependencies trigger fallback mocks that produce valid-looking but empty maps
- **Untestable:** Testing a single stage requires booting the entire engine

To achieve the target architecture, we must extend `MapGenStep`/`PipelineExecutor` from foundation to all legacy clusters. This unlocks:

- **Step-level composition:** Mod authors can add, replace, or reorder steps
- **Explicit contracts:** Steps declare what they need and what they provide
- **Fail-fast behavior:** Missing dependencies throw immediately, not silently degrade
- **Testability:** Steps can be tested in isolation with mock contexts

## Capability Unlocks

- Steps can be reordered or replaced by mods without touching core engine code
- New steps can be introduced that consume canonical products
- Debugging is easier—clear trace of "Starting Step X... Finished Step X (15ms)"
- Foundation for M3 Stacks 2–7 to wrap their respective clusters

## Deliverables

- [ ] **`MapGenStep` interface**
  - Properties: `id`, `phase`, `requires`, `provides`
  - Methods: `shouldRun(context)`, `run(context)`
  - Defined per `architecture.md` contract

- [ ] **`StepRegistry`**
  - Plugin system to register steps by ID (e.g., `core.mesh.voronoi`)
  - Lookup by ID for recipe resolution
  - Track which products are available after each step via `provides`

- [ ] **`PipelineExecutor`**
  - Iterate through a JSON/code recipe
  - Resolve steps from Registry
  - Validate `requires` before running each step
  - Throw `MissingDependencyError` on contract violations

- [ ] **Runtime `requires`/`provides` gating**
  - Steps that declare `requires: ["heightfield"]` fail fast if `heightfield` is missing
  - Dev-mode validation that warns on undeclared dependencies

- [ ] **Standard pipeline recipe**
  - JSON or code-driven recipe that wraps all current orchestrator stages as steps
  - Produces coherent maps equivalent to current orchestrator flow

- [ ] **`LegacyMorphologyStep` wrapper**
  - Covers mountains/volcanoes/coastlines/islands
  - Publishes `Heightfield` as a canonical product
  - Wrap-first: preserves current behavior, no algorithm changes

- [ ] **Parallel entry paths**
  - New executor path alongside existing orchestrator path
  - Both paths functional during transition
  - Switch defaults only when standard pipeline recipe is validated

- [ ] **Documentation**
  - Wrapper step scaffolding pattern documented for subsequent stacks
  - Step contract and recipe format documented

## Acceptance Criteria

- [ ] `PipelineExecutor.run(context, recipe)` executes a full map generation and produces coherent output
- [ ] Steps with unmet `requires` fail fast with clear error messages (`MissingDependencyError`)
- [ ] Both entry paths (executor and orchestrator) produce equivalent maps during transition
- [ ] Wrapper step pattern is documented so Stacks 2–5 can follow it
- [ ] A step with unmet `requires` fails fast; no silent "limp through" behavior
- [ ] The executor builds/validates a dependency graph before or during execution

## Out of Scope

- Changing generation algorithms (wrap-first only)
- Per-step config schemas (global `MapGenConfig` schema only in M3)
- Exhaustive validation/test hardening (deferred to M4)

## Open Questions & Considerations

- **Minimal wrapper boundary:** What is the minimal wrapper boundary per cluster that yields clean `requires`/`provides` and canonical product read/write paths without changing generation algorithms?
- **Runtime validator scope:** What is the minimal runtime validator that can safely gate execution in M3 vs. more exhaustive validation in M4?
- **Recipe format:** JSON vs. code-driven recipe—what's the right balance for mod authors vs. internal use?

## Dependencies & Relationships

**Depends on:**
- M2 completion: validated config + foundation slice driven by `MapOrchestrator`

**Blocks:**
- Stack 2: `LOCAL-M3-HYDROLOGY-PRODUCTS` (hydrology productization)
- Stack 3: `LOCAL-M3-STORY-SYSTEM` (story system modernization)
- Stack 4: `LOCAL-M3-BIOMES-FEATURES-WRAPPER` (biomes/features wrapper)
- Stack 5: `LOCAL-M3-PLACEMENT-WRAPPER` (placement wrapper)
- Stack 6: `LOCAL-M3-CONFIG-EVOLUTION` (config evolution)
- Stack 7: `LOCAL-M3-ADAPTER-COLLAPSE` (adapter boundary collapse)

**Related PRDs & Docs:**
- `../resources/PRD-pipeline-refactor.md`
- `../../system/libs/mapgen/architecture.md`
- `../issues/LOCAL-TBD-foundation-step-1-pipeline.md` through step-5

## Risk Controls

- **Branch safety:** Keep the stack runnable end-to-end (buildable and producing coherent maps) even while the default execution path is being switched over
- **Fallback:** Keep the current orchestrator path as the fallback while the executor path is being introduced
- **Switch timing:** Switch defaults only when the standard pipeline recipe is complete and validated

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

### Key Files (Expected)

- `packages/mapgen-core/src/core/pipeline.ts` (new: interfaces + registry + executor)
- `packages/mapgen-core/src/core/types.ts` (modify: context definitions)
- `packages/mapgen-core/src/core/errors.ts` (new: `MissingDependencyError`)
- `packages/mapgen-core/src/steps/legacy-morphology.ts` (new: wrapper step)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify: parallel entry path)

### Design Notes

- Steps must be stateless (except for configuration)
- `MapGenContext` is the shared blackboard, split into `fields` (Canvas) and `artifacts` (Intermediate)
- Executor logs "Starting Step X..." and "Finished Step X (15ms)" for clear trace
