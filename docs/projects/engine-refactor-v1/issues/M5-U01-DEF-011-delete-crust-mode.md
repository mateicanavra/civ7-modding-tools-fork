---
id: M5-U01
title: "[M5] DEF-011: Delete `crustMode` and the legacy behavior branch"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove the `crustMode` selector from the public config surface and delete the `"legacy"` algorithm branch so mapgen has a single canonical behavior path.

## Goal

Make it impossible to accidentally “keep legacy alive” through configuration. If `crustMode` exists, it will be used; if it is used, we have to maintain two paths; therefore it must be removed and the behavior unified.

## Deliverables

- Remove `crustMode` from the config schema and any forwarding/plumbing layers.
- Delete the `"legacy"` behavior branch in landmask/crust/ocean separation.
- Update any tests/docs that assume the existence of the selector or the legacy behavior.

## Acceptance Criteria

- `crustMode` is not accepted by any schema or runtime parsing path.
- No `"legacy"` branch remains on the runtime path for crust/landmask behavior.
- Standard smoke test remains green under `MockAdapter`.
- Docs no longer present `"legacy"` as a supported/valid configuration.

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- Standard smoke test (exact command/path may move during M5 extraction; update when the standard mod boundary is established).

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-011, locked).
- **Sequencing:** do early to avoid churn while packages/steps are moved.
- **Complexity × parallelism:** medium complexity, high parallelism (localized but semantics-sensitive).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Treat this as “delete the fork,” not “preserve both behind a different name.”
- Prefer deleting wiring and updating callers over keeping “compat parsing” for removed keys.

## Prework Prompt (Agent Brief)

Goal: make implementation mechanical by enumerating the full `crustMode` surface and every behavior fork it controls.

Deliverables:
- A complete inventory of `crustMode` usage across config schema, parsing, defaults, and call sites.
- A complete inventory of `"legacy"` vs `"area"` branches (and any other behavior forks that are implicitly tied to the selector).
- A short note on what the default behavior is today, what tests/docs assume, and what will change once the fork is deleted.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

