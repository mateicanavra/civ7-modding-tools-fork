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

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Re-home tests so engine coverage stays in `packages/mapgen-core` and content coverage moves to the mod.
- Ensure at least one standard recipe smoke path compiles an `ExecutionPlan` and executes with a mock adapter.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Test harness inventory (what exists today)
- **Goal:** Avoid inventing a new harness by enumerating the current test runner(s), file locations, and existing smoke utilities.
- **Commands:**
  - `cat packages/mapgen-core/package.json`
  - `find packages/mapgen-core -maxdepth 3 -type f | rg "test|spec"`
  - `cat mods/mod-swooper-maps/package.json`
  - `find mods/mod-swooper-maps -maxdepth 4 -type f | rg "test|spec"`
- **Output to capture:**
  - The current test commands per package and which runner they use.
  - The list of existing tests that exercise compile/execute (if any).

#### P2) Existing mock adapter / smoke utilities inventory
- **Goal:** Reuse the current `MockAdapter` path (or equivalent) for the M6 recipe smoke check.
- **Commands:**
  - `rg -n "MockAdapter" packages mods -S`
  - `rg -n "createMock|mock-adapter" packages mods -S`
- **Output to capture:**
  - Where the mock adapter lives and how tests currently initialize a context/run.
  - The minimal smoke test shape to replicate post-cutover.

### Prework Findings (Pending)
_TODO (agent): append findings here; include the chosen smoke test entrypoint and any CI gate updates required._
