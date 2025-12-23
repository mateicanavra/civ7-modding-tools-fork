---
id: LOCAL-TBD-M4-FOUNDATION-SURFACE-CUTOVER
title: "[M4] Foundation surface cutover: `ctx.artifacts.foundation` + `artifact:foundation` (remove `ctx.foundation`)"
state: planned
priority: 2
estimate: 6
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Foundation]
parent: null
children: []
blocked_by: [LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER]
blocked: []
related_to: [LOCAL-TBD-M4-SAFETY-NET]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

By end of M4, eliminate `ctx.foundation` as a top-level surface. Keep the **existing monolithic FoundationContext payload** for now, but make it a normal artifact: publish it at `ctx.artifacts.foundation` and address it via the registered tag `artifact:foundation`. Migrate all consumers to the artifacts-based surface. The later split into `artifact:foundation.*` sub-artifacts stays deferred (DEF-014).

## Why This Exists

M4’s north star is “inter-step surfaces match the target architecture.” A legacy top-level `ctx.foundation` surface is an architectural mismatch and creates hidden coupling. This issue makes foundation “just another artifact” without taking on the heavier work of splitting foundation into multiple artifacts in M4.

## Non-Negotiable Rules (No Black Ice)

- `ctx.foundation` is **disallowed** as a contract surface by end of this issue.
- For M4, **do not introduce** `artifact:foundation.mesh|crust|plateGraph|tectonics` (or similar) as discrete artifacts. That work is explicitly deferred (DEF-014).
- For M4, foundation dependencies are expressed as **one tag**: `artifact:foundation`.
- The payload is intentionally monolithic in M4; do not change its shape except for mechanical migration needs.

## Deliverables

- `artifact:foundation` is a first-class, registered artifact tag in the instantiated registry catalog (schema = FoundationContext-like payload; demo payload optional).
- The foundation producer publishes the monolithic payload to `ctx.artifacts.foundation` and satisfies `artifact:foundation` via the standard artifact verification path (`ctx.artifacts.get("artifact:foundation")`).
- All in-repo consumers are migrated to read the foundation payload via:
  - `ctx.artifacts.get("artifact:foundation")` (preferred when code is tag-driven/generic), or
  - `ctx.artifacts.foundation` (allowed ergonomic structured surface for domain code).
- `ctx.foundation` is removed from the runtime context shape (types + runtime object) and is not used as a dependency or compatibility surface.
- Deferral and contract docs are reconciled so “M4 surface migration” is in-scope and only the “split into discrete artifacts” remains deferred (DEF-014).

## Acceptance Criteria

- `ctx.foundation` does not exist on the runtime context surface (type-level and runtime object).
- No production code references `ctx.foundation`:
  - `rg -n "ctx\\.foundation" packages/` returns no matches.
- `artifact:foundation` verification/satisfaction does not special-case `context.foundation`:
  - Artifact verification is performed via the artifact store (`ctx.artifacts.get(tag)`).
- The default pipeline run still succeeds (stub adapter / smoke tests), with no behavior change beyond the access surface migration.
- DEF-014 is updated to defer only the post-M4 split into discrete `artifact:foundation.*` products.

## Testing / Verification

- `pnpm check`
- `pnpm test:mapgen`
- Run the M4 smoke tests (once they exist under Safety Net): `pnpm -C packages/mapgen-core test` should cover at least one stub-adapter end-to-end pass that exercises foundation consumers.

## Dependencies / Notes

- **Blocked by:** Tag registry cutover must make `artifact:*` verification registry-driven (LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER).
- **Doc touchpoints to keep canonical after landing:**
  - `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (foundation surface section)
  - `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` (monolithic payload contract, but on artifacts surface)
  - `docs/projects/engine-refactor-v1/deferrals.md` (DEF-014 scope)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Thin-slice sequence (recommended)

1) Add the new canonical surface: `ctx.artifacts.foundation` + `artifact:foundation` lookup.
2) Bulk-migrate all consumers to the new surface (mechanical refactor).
3) Delete `ctx.foundation` entirely (types + runtime object), and hard-fail any remaining accesses.

### Guardrails

- Keep the payload monolithic; do not opportunistically restructure foundation internals in this issue.
- Any temporary compatibility alias (if used to stage a stacked PR) must be removed before completing this issue.
