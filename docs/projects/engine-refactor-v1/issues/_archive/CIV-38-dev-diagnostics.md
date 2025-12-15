---
id: CIV-38
title: "[M2] Dev Diagnostics & Stage Executor Logging for Stable Slice"
state: planned
priority: 1
estimate: 2
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Diagnostics, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-30, CIV-31, CIV-37]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Finish wiring and validating the developer diagnostics surface and stage‑level executor logging/timing in the current `MapOrchestrator` slice, so the **foundation + minimal story** stages are observable and regressions are easy to spot.

## Deliverables

- [x] **Dev flag wiring**
  - Confirm `MapOrchestrator.generateMap()` initializes `DEV` from `foundation.diagnostics` (camelCase keys) and enables diagnostics for the generation pass.
  - Ensure the stable‑slice diagnostics keys used today are documented and consistent with code.
- [x] **Validated stable‑slice diagnostics surface**
  - Promote the currently‑used `foundation.diagnostics` dev flags into `MapGenConfigSchema` as explicit, validated keys (matching `DevLogConfig` in `dev/flags.ts`).
  - Keep `foundation.diagnostics` as the canonical stable‑slice diagnostics block; document it as M2‑supported config.
- [x] **Diagnostics surface cleanup**
  - Deprecate/remove the unused top‑level `diagnostics.*` schema/docs (`logAscii`, `logHistograms`) so the documented surface matches runtime behavior.
  - If a deprecated surface must remain in schema text for back‑compat, mark it clearly as legacy/non‑functional in M2.
- [x] **Stage‑level executor logging**
  - Emit a clear start/finish log for each stage in the orchestrator slice, including duration.
  - Surface stage errors with a consistent prefix and include them in `stageResults`.
- [x] **Foundation diagnostics parity**
  - Ensure existing `[Foundation]` summaries, ASCII maps, histograms, and boundary metrics are reachable via `DEV` flags for the foundation/plate stages.
- [x] **Minimal smoke warnings**
  - When a stage is enabled but yields obviously empty results (e.g., zero plates, empty story tags), emit a warning to aid debugging.

## Acceptance Criteria

- [x] Running a map generation with diagnostics enabled produces:
  - Per‑stage start/finish logs with durations.
  - Foundation summaries/ASCII/histograms when the corresponding `DEV.LOG_FOUNDATION_*` flags are true.
- [x] `foundation.diagnostics` is explicitly modeled in `MapGenConfigSchema` with the same camelCase keys accepted by `initDevFlags`, and those keys are documented as stable‑slice config.
- [x] Top‑level `diagnostics.*` is either removed or clearly marked deprecated/non‑functional in schema/docs.
- [x] When diagnostics flags are absent/disabled, diagnostics output is no‑op except for critical errors.
- [x] Stage failures are logged once with a consistent prefix and recorded in `stageResults`.
- [x] Build and tests pass.

## Out of Scope

- Step‑level logging conventions for `MapGenStep` / `PipelineExecutor` (owned by M3).
- Canonical data‑product validation or manifest `requires/provides` enforcement (owned by M4).
- Any redesign of diagnostics beyond promoting and documenting the already‑used stable‑slice flags.

## Dependencies / Notes

- Sources:
  - TS dev modules: `packages/mapgen-core/src/dev/**`
  - Orchestrator stage flow: `packages/mapgen-core/src/MapOrchestrator.ts`
  - JS reference: `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/bootstrap/dev.js`
  - Parity/context: `resources/config-wiring-status.md` (diagnostics), `resources/STATUS-M-TS-parity-matrix.md` (§5.5 Dev diagnostics)
- Should land after config/tunables/orchestrator wiring is stable (CIV‑30/CIV‑31).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Add timing wrappers around stage dispatch using `timeSection` or equivalent, gated by `DEV.LOG_TIMING`.
- Prefer a single orchestrator logging helper to keep prefixes stable.
- Keep smoke warnings lightweight and non‑fatal; M4 will own stronger validation.
