---
id: LOCAL-TBD-M4-SAFETY-1
title: "[M4] Safety net (1/2): step-level tracing foundation"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Observability]
parent: M4-SAFETY-NET
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-SAFETY-2]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add the shared tracing foundation (run id, plan fingerprint, step timing) plus per-step trace toggles and rich step event hooks.

## Deliverables

- Run id + recipe/plan fingerprint emitted at pipeline start.
- Step start/finish timing captured in a shared trace sink.
- Per-step trace toggles (settings/recipe) so steps can emit rich events without code changes.

## Acceptance Criteria

- Tracing can be enabled/disabled per step without modifying step code.
- Steps can emit structured trace events via a shared API when tracing is enabled.
- Core tracing does not change pipeline behavior when disabled.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A minimal test asserts trace output when toggles are enabled.

## Dependencies / Notes

- **Parent:** [M4-SAFETY-NET](M4-SAFETY-NET.md)
- **Blocks:** LOCAL-TBD-M4-SAFETY-2

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep tracing payloads small by default; richer events are opt-in per step.
- Ensure trace sinks are pluggable for tests.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
