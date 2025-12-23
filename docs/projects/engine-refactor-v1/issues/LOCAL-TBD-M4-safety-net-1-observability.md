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
- A minimal test enables tracing and asserts:
  - `run.start`/`run.finish` events include `runId` + `planFingerprint`
  - `step.start`/`step.finish` events are emitted for at least one step

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

## Pre-work

Goal: define a minimal, stable tracing foundation (event model + sink interface) and a deterministic plan fingerprint strategy so observability is reliable during M4 cutovers.

### Canon anchors (SPIKE §2.10)

Accepted baseline:
- Required: structured compile/run errors, deterministic `runId`, stable plan fingerprint (hash) derived from *recipe + settings + per-step config*.
- Optional: pluggable tracing sinks; rich tracing toggleable globally + per step occurrence; toggles must not change execution semantics.

### 1) Minimal trace event model (stable contract)

#### Event envelope (required fields)

```ts
type TraceEvent = {
  tsMs: number;             // monotonic if available; else Date.now
  runId: string;            // deterministic (see fingerprint section)
  planFingerprint: string;  // stable hash of the ExecutionPlan inputs

  kind:
    | "run.start"
    | "run.finish"
    | "step.start"
    | "step.finish"
    | "step.event";

  // Step occurrence identity (for repeated step IDs in a recipe).
  stepId?: string;          // registry id, e.g. "biomes"
  nodeId?: string;          // stable per-occurrence id in ExecutionPlan (preferred)

  // Optional details
  phase?: string;           // e.g. "hydrology"
  durationMs?: number;      // for step.finish
  success?: boolean;        // for step.finish / run.finish
  error?: string;           // structured error string/code payload
  data?: unknown;           // step-owned payload (kept small; optional)
};
```

#### Sink interface (pluggable)

```ts
interface TraceSink {
  emit(event: TraceEvent): void;
}
```

Implementation note:
- **M4 decision:** always wire a sink; when tracing is disabled, the sink is a no-op (`emit() {}`). Per-step verbosity toggles gate **payload emission** (avoid building/allocating `data` when disabled) while preserving "no behavior change when disabled."

### 2) Plan fingerprint algorithm (deterministic spec)

Objective:
- Same semantic inputs → same `planFingerprint`, regardless of object key order or runtime nondeterminism.

#### Inputs (must include)

- Normalized recipe (ordered list of step occurrences)
  - step IDs per occurrence (not just unique set)
- Resolved per-occurrence config (after defaults/overrides applied)
- Run settings that affect semantics (seed, enablement, etc.)

#### Exclusions (should NOT affect fingerprint)

- Pure observability toggles (trace enablement, verbosity), since they should not change execution semantics.
  - **M4 decision:** trace config does not influence correlation IDs; do not add a `traceConfigFingerprint` in M4. If you believe it is required, stop and add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting why + expected consumers, then ask for confirmation before proceeding.

#### Canonical serialization

Use "canonical JSON":
- Preserve recipe order as authored (array order is significant).
- Sort object keys recursively (stable ordering).
- For maps/sets: serialize as sorted arrays of entries.
- For `undefined`: omit keys; for `null`: include explicit null.

#### Hash choice

- Use `sha256` (stable, widely available) over the canonical JSON string.
- **M4 decision:** output as lowercase hex.

Pseudo:
```ts
planFingerprint = sha256(canonicalJson({
  version: 1,
  recipe: [{ nodeId, stepId, config }...],
  settings: { seed, ...semanticsOnly },
}));
```

### 3) Hook points (where to emit events)

Primary hooks (target path):
- **Plan compilation** (ExecutionPlan compiler):
  - emit/return: `planFingerprint`, `runId`, normalized recipe, resolved configs, and compile-time errors as structured diagnostics.
- **Plan execution** (executor):
  - `run.start` before first node executes
  - `step.start` immediately before `run()`
  - `step.finish` immediately after `run()` (include duration + success/error)
  - `run.finish` at end with final status and summary counts

Concrete current-code analogs (for locating future wiring):
- `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` already has step loop boundaries and timing points suitable for `step.start`/`step.finish`.
- Orchestrator entrypoint `packages/mapgen-core/src/orchestrator/task-graph.ts` is a natural place to emit `run.start`/`run.finish` once execution is behind `ExecutionPlan`.

### 4) Per-step trace toggles (shape sketch)

Goal: enable/disable richer events without step code changes beyond calling a shared API once instrumentation exists.

Suggested config shape (lives in RunRequest settings, not in MapGenConfig):
```ts
type TraceConfig = {
  enabled: boolean;
  steps?: Record<string, "off" | "basic" | "verbose">; // keyed by stepId
};
```

Rules:
- `enabled: false` means no events are emitted (no-op sink).
- `basic` enables start/finish timing only.
- `verbose` allows `step.event` payloads (step-owned) to flow to sinks.
