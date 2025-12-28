---
id: LOCAL-TBD-M6-U01
title: "[M6] Promote runtime pipeline as engine SDK surface"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Move the runtime pipeline into `engine/**` and make it the canonical runtime SDK surface.

## Deliverables
- `packages/mapgen-core/src/engine/**` contains runtime modules and types.
- Public exports point at `engine/**` (no `pipeline/**` surface).
- Engine tests import from the engine SDK.

## Acceptance Criteria
- `StepRegistry`, `TagRegistry`, `compileExecutionPlan`, `PipelineExecutor`, and runtime errors/types/observability live under `engine/**`.
- `packages/mapgen-core/src/index.ts` exports the engine SDK without legacy pipeline re-exports.
- Engine tests pass while importing from `@swooper/mapgen-core/engine`.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`

## Dependencies / Notes
- No blocking dependencies.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Move/rename runtime modules from `pipeline/**` to `engine/**` (registry, executor, compiler, types, errors, observability).
- Update internal imports and the package export map to align with the new engine surface.
- Adjust engine tests to use the `engine/**` path.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Runtime move surface + import manifest
- **Goal:** Build a concrete list of files and import sites that must change so the `pipeline/** → engine/**` move is purely mechanical (no missed edges).
- **Commands:**
  - `find packages/mapgen-core/src/pipeline -type f -maxdepth 2`
  - `rg -n "@mapgen/pipeline" -S`
  - `rg -n "from \"@mapgen/pipeline" packages/mapgen-core/src -S`
  - `rg -n "@swooper/mapgen-core" mods -S`
- **Output to capture:**
  - List of `packages/mapgen-core/src/pipeline/**` files (canonical move list).
  - Top 20–50 import sites outside `pipeline/**` that reference it (group by package).

#### P2) Engine context coupling audit (must not leak into engine)
- **Goal:** Identify where engine runtime currently depends on content/legacy context so we can split it cleanly during the move.
- **Commands:**
  - `rg -n "@mapgen/core/types" packages/mapgen-core/src/pipeline -S`
  - `rg -n "ExtendedMapContext" packages/mapgen-core/src/pipeline -S`
  - `rg -n "MapGenConfig" packages/mapgen-core/src/pipeline -S`
- **Output to capture:**
  - A file-by-file list of runtime coupling points and what types they pull in.
  - A recommended minimal engine-owned type strategy:
    - either `TContext` generics everywhere, or
    - a minimal `EngineContext` interface (explicitly listed).

#### P3) Package export surface audit
- **Goal:** Confirm where `engine` needs to be exported and ensure `packages/mapgen-core/src/index.ts` becomes thin/compat-only.
- **Commands:**
  - `cat packages/mapgen-core/package.json`
  - `sed -n '1,200p' packages/mapgen-core/src/index.ts`
- **Output to capture:**
  - A concrete diff plan: what exports are added for `./engine` and what legacy re-exports are removed.

### Prework Findings (Pending)
_TODO (agent): append findings here (keep raw lists short; link to file paths; record any decisions that affect downstream call sites)._
