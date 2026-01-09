---
id: LOCAL-TBD-M7-F1
title: "[M7] Verify no shims + remove dead paths"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [technical-debt]
parent: LOCAL-TBD-M7-F
children: []
blocked_by:
  - LOCAL-TBD-M7-A2
  - LOCAL-TBD-M7-B4
  - LOCAL-TBD-M7-C3
  - LOCAL-TBD-M7-D2
  - LOCAL-TBD-M7-E2
blocked:
  - LOCAL-TBD-M7-F2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

This is a cleanup gate: confirm we ended with one architecture and remove dead exports/paths introduced during the cutover.

## Deliverables

- Confirm no compatibility shims were introduced; delete any dead paths if present.

## Acceptance Criteria

- [ ] No compatibility shims remain (no dual entrypoints, no parallel config path).
- [ ] Legacy error codes and dead paths are deleted (including `step.resolveConfig.failed`).

## Scope Boundaries

**In scope:**
- Deleting compatibility shims and dead code introduced during the migration (no long-lived dual path).
- Removing now-obsolete error codes and legacy runtime-only config synthesis helpers.

**Out of scope:**
- Introducing new compatibility layers; if needed temporarily, they must be explicitly called out and removed before milestone completion.

## Testing / Verification

- `pnpm test`
- `rg -n "\\bresolveConfig\\b" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits)
- `rg -n "Value\\.(Default|Convert|Clean)" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits outside compiler-only paths)

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-A2](./LOCAL-TBD-M7-A2-compile-recipe-config-wiring.md), [LOCAL-TBD-M7-B4](./LOCAL-TBD-M7-B4-op-normalize-semantics.md), [LOCAL-TBD-M7-C3](./LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md), [LOCAL-TBD-M7-D2](./LOCAL-TBD-M7-D2-planner-validate-only.md), [LOCAL-TBD-M7-E2](./LOCAL-TBD-M7-E2-ecology-steps-migration.md)
- **Blocks:** [LOCAL-TBD-M7-F2](./LOCAL-TBD-M7-F2-final-hygiene.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/**` | Ensure only compile-first recipe config paths remain; remove any legacy config plumbing. |
| `/packages/mapgen-core/src/engine/**` | Remove runtime default/clean and resolveConfig surfaces; ensure validate-only behavior is the only engine path. |
| `/mods/mod-swooper-maps/src/**` | Remove any lingering resolveConfig usage, deep imports, and legacy config shims introduced during migration. |
| `/scripts/lint/lint-domain-refactor-guardrails.sh` | Update guardrails to match final enforcement expectations (as needed). |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
