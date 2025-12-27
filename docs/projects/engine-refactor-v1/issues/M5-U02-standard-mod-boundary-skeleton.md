---
id: M5-U02
title: "[M5] Standard mod boundary: introduce the plugin package skeleton + invariants"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Create the real “standard mod” package boundary and prove core can compile/execute a minimal pipeline without importing any standard-domain modules.

## Goal

Make the ownership boundary real: core is the generic pipeline engine, and the standard pipeline exists as a mod/plugin that core can load and run through a small contract.

## Deliverables

- Establish a standard-mod package boundary that can be built/tested in the workspace.
- Define a minimal registration entrypoint contract between core and mod (how core discovers and loads the mod’s registration).
- Prove the contract with a “hello pipeline” path: core compiles and executes a minimal registration without importing standard-domain code.

## Acceptance Criteria

- The standard mod boundary exists as its own package/module and is loadable by the workspace.
- Core compiles/executes a minimal pipeline registration while remaining free of standard-domain imports.
- The integration contract is documented and stable enough to be depended on by CLI/tests.

## Testing / Verification

- A minimal compile+execute run passes under `MockAdapter`.
- Workspace build/typecheck remains green for the new package boundary.

## Dependencies / Notes

- **Paper trail:** target-architecture package boundary; see spike at `docs/projects/engine-refactor-v1/spikes/2025-12-26-m5-clean-architecture-finalization-scope.md`.
- **Complexity × parallelism:** medium complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Do not “fake” the boundary by re-exporting from core; the point is to invert import ownership.
- Bias toward the smallest possible entrypoint surface; avoid encoding standard-domain concepts in the core contract.

## Prework Prompt (Agent Brief)

Goal: define the minimal contract for “a mod registers a pipeline” and map the current wiring so implementation is straightforward.

Deliverables:
- A map of the current mod loader + registry wiring (who calls what, and where standard registration currently happens).
- A proposed minimal standard-mod entrypoint API (exports, registration hooks, discovery mechanism) that keeps core free of standard-domain imports.
- A sketch of the simplest “hello pipeline” proof path (what gets registered, and how the executor is invoked).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

