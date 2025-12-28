---
id: LOCAL-TBD-M6-U08
title: "[M6] Realign tests and CI gates to ownership"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U05]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Move tests to match the new ownership boundaries and keep the CI gates aligned.

## Deliverables
- Engine tests cover engine and authoring surfaces only.
- Content tests live under `mods/mod-swooper-maps/test/**`.
- Standard recipe compiles and executes under a mock adapter or existing harness.

## Acceptance Criteria
- Engine SDK tests pass without relying on mod-owned content.
- Content tests validate recipe compile and at least one end-to-end execution path.
- CI gates run the correct package-level test suites.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)

## Remediation (SPIKE alignment)
- [ ] Align with [SPIKE (M6)](../resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md) by completing [R3](../plans/m6-spike-structure-remediation-plan.md#r3).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Re-home tests so engine coverage stays in `packages/mapgen-core` and content coverage moves to the mod.
- Ensure at least one standard recipe smoke path compiles an `ExecutionPlan` and executes with a mock adapter.

## Implementation Decisions

### Move content tests into the mod package
- **Context:** Legacy/base/orchestrator tests lived under `packages/mapgen-core/test/**` but now cover mod-owned domain logic.
- **Options:** Keep tests in core with new stubs, move to `mods/mod-swooper-maps/test`, delete legacy-only tests.
- **Choice:** Move domain/content tests into `mods/mod-swooper-maps/test` and delete orchestrator/bootstrap/config tests.
- **Rationale:** Keeps engine tests content-agnostic and aligns ownership boundaries for CI gates.
- **Risk:** Legacy orchestrator coverage is dropped; any regressions there will be caught only if legacy paths are still used.

### Replace base tag fixtures in engine tests
- **Context:** Engine tests previously depended on `@mapgen/base` tag catalogs, which are being removed.
- **Options:** Keep importing base tags until U07, re-create local test tags, or hoist tags into engine fixtures.
- **Choice:** Use local test tag definitions per test file.
- **Rationale:** Avoids coupling engine tests to mod-owned content and lets base removal proceed cleanly.
- **Risk:** Test tags may diverge from real content tags; mitigated by moving content-tag validation tests into the mod package.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings
#### P1) Test harness inventory (what exists today)
- `packages/mapgen-core`:
  - `test` script uses `bun test` (`packages/mapgen-core/package.json`).
  - Existing tests include pipeline compile/execute (`test/pipeline/execution-plan.test.ts`, `test/pipeline/standard-smoke.test.ts`) and orchestrator smoke tests (which will be removed or migrated).
- `mods/mod-swooper-maps`:
  - No `test` script and no existing test files.
  - Will need a new test runner entry (likely `bun test` to match mapgen-core) and a new test directory.

#### P2) Existing mock adapter / smoke utilities inventory
- Mock adapter lives in `@civ7/adapter` (`packages/civ7-adapter/src/mock-adapter.ts`) and is re-exported as `createMockAdapter` from `@civ7/adapter` or `@civ7/adapter/mock`.
- Many mapgen-core tests already use `createMockAdapter` + `createExtendedMapContext` as the minimal harness.
- Proposed smoke test shape for the mod package:
  - Instantiate `createMockAdapter({ width, height, mapSizeId, mapInfo, rng })`.
  - Build a minimal `RunSettings` + recipe config.
  - `recipe.compile(...)` then `recipe.run(...)` (or `compileExecutionPlan` + `PipelineExecutor.executePlan`) and assert success.
