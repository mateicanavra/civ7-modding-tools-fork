---
id: LOCAL-TBD-M4-SAFETY-1
title: "[M4] Safety net: step-level tracing foundation"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Observability]
parent: LOCAL-TBD-M4-SAFETY-NET
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-1]
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

- **Parent:** [LOCAL-TBD-M4-SAFETY-NET](LOCAL-TBD-M4-SAFETY-NET.md)
- **Blocks:** LOCAL-TBD-M4-SAFETY-2
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-1 (plan compiler/RunRequest boundary exists)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep tracing payloads small by default; richer events are opt-in per step.
- Ensure trace sinks are pluggable for tests.
- Plan fingerprint/runId determinism requires a stable serialization strategy for recipe + settings + per-step config; keep hashing consistent across runs.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: define the minimal trace model and plan fingerprint strategy required by the target observability baseline.

Deliverables:
- A trace event model (core fields: runId, plan fingerprint, step start/finish timing, optional step events).
- A plan fingerprint algorithm spec (inputs, serialization order, hash choice); must include recipe + settings + per-step config.
- A list of hook points to emit run start/end and step-level events (compiler/executor locations).
- A sketch of per-step trace toggles (recipe/settings shape).

Where to look:
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Observability),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.10).
- Existing diagnostics: `packages/mapgen-core/src/config/schema.ts`,
  `packages/mapgen-core/src/orchestrator/task-graph.ts`,
  `packages/mapgen-core/src/dev/timing.ts`,
  `packages/mapgen-core/src/core/types.ts`.

Constraints/notes:
- Tracing must be optional and must not change execution when disabled.
- The plan fingerprint must be deterministic across runs.
- Do not implement code; return the model and hook list as markdown tables/lists.
