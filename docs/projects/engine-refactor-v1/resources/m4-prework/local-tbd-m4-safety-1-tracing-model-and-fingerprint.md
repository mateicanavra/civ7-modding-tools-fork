# Prework — `LOCAL-TBD-M4-SAFETY-1` (Trace model + plan fingerprint spec)

Goal: define a minimal, stable tracing foundation (event model + sink interface) and a deterministic plan fingerprint strategy so observability is reliable during M4 cutovers.

## Canon anchors (SPIKE §2.10)

Accepted baseline:
- Required: structured compile/run errors, deterministic `runId`, stable plan fingerprint (hash) derived from *recipe + settings + per-step config*.
- Optional: pluggable tracing sinks; rich tracing toggleable globally + per step occurrence; toggles must not change execution semantics.

## 1) Minimal trace event model (stable contract)

### Event envelope (required fields)

```ts
type TraceEvent = {
  tsMs: number;             // monotonic if available; else Date.now
  runId: string;            // deterministic (see fingerprint section) or stable UUID
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

### Sink interface (pluggable)

```ts
interface TraceSink {
  emit(event: TraceEvent): void;
}
```

Implementation note:
- When tracing is disabled, provide a no-op sink (`emit() {}`) and/or gate `emit` calls behind toggles. This preserves “no behavior change when disabled.”

## 2) Plan fingerprint algorithm (deterministic spec)

Objective:
- Same semantic inputs → same `planFingerprint`, regardless of object key order or runtime nondeterminism.

### Inputs (must include)

- Normalized recipe (ordered list of step occurrences)
  - step IDs per occurrence (not just unique set)
- Resolved per-occurrence config (after defaults/overrides applied)
- Run settings that affect semantics (seed, enablement, etc.)

### Exclusions (should NOT affect fingerprint)

- Pure observability toggles (trace enablement, verbosity), since they should not change execution semantics.
  - If we want trace config to influence correlation IDs, create a separate `traceConfigFingerprint` rather than folding it into the plan fingerprint.

### Canonical serialization

Use “canonical JSON”:
- Preserve recipe order as authored (array order is significant).
- Sort object keys recursively (stable ordering).
- For maps/sets: serialize as sorted arrays of entries.
- For `undefined`: omit keys; for `null`: include explicit null.

### Hash choice

- Use `sha256` (stable, widely available) over the canonical JSON string.
- Output as lowercase hex or base64url (pick one and keep stable).

Pseudo:
```ts
planFingerprint = sha256(canonicalJson({
  version: 1,
  recipe: [{ nodeId, stepId, config }...],
  settings: { seed, ...semanticsOnly },
}));
```

## 3) Hook points (where to emit events)

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

## 4) Per-step trace toggles (shape sketch)

Goal: enable/disable richer events without step code changes beyond calling a shared API once instrumentation exists.

Suggested config shape (lives in RunRequest settings, not in MapGenConfig):
```ts
type TraceConfig = {
  enabled: boolean;
  steps?: Record<string, "off" | "basic" | "verbose">; // keyed by stepId (or nodeId)
};
```

Rules:
- `enabled: false` means no events are emitted (no-op sink).
- `basic` enables start/finish timing only.
- `verbose` allows `step.event` payloads (step-owned) to flow to sinks.

