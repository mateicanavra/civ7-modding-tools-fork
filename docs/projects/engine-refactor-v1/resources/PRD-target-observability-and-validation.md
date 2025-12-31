# PRD: Target Observability & Validation

## 1. Purpose

Define the mandatory observability, validation, and failure semantics for the target MapGen architecture. This PRD captures the required outputs, validation behavior, and optional tracing model described in `SPEC-target-architecture-draft.md`.

## 2. Scope

**In scope**
- Compile-time and runtime validation behavior (fail-fast rules).
- Required observability outputs (plan fingerprint, run IDs, structured errors).
- Optional tracing/diagnostics toggles and event model constraints.

**Out of scope**
- Runtime/recipe structure (see `PRD-target-task-graph-runtime.md`).
- Registry/tag definitions (see `PRD-target-registry-and-tag-catalog.md`).
- Context storage and satisfaction rules (see `PRD-target-context-and-dependency-contract.md`).

## 3. Goals

1) Fail-fast validation at compile time and per-step execution with structured, actionable errors.  
2) Deterministic, explainable runs via stable run IDs and plan fingerprints.  
3) Optional tracing that can be enabled globally or per step without changing execution semantics.

## 4. Requirements

### 4.1 Compile-Time Validation
- **REQ-OBS-1:** Recipe compilation fails fast on schema violations, unknown step/tag IDs, and invalid per-step config keys.
- **REQ-OBS-2:** Validation uses registry metadata and per-step config schemas; errors are structured and attributable to specific recipe entries.

### 4.2 Runtime Validation
- **REQ-OBS-3:** Executors validate dependencies before each step; missing requirements produce structured runtime errors (no silent skips).
- **REQ-OBS-4:** Post-step contract checks verify required outputs are present; missing `provides` are surfaced as failures.
- **REQ-OBS-5:** Capability/precondition checks must fail loudly with explicit error types; they are not treated as optional toggles.

### 4.3 Required Outputs
- **REQ-OBS-6:** Each run produces a deterministic `runId` and a stable plan fingerprint derived from `{settings, recipe, step IDs, resolved config}`.
- **REQ-OBS-7:** The compiled `ExecutionPlan` retains normalized data sufficient to explain scheduling (resolved node IDs, `requires`/`provides`, resolved config).
- **REQ-OBS-8:** Structured error surfaces exist for both compilation failures and runtime step failures (including missing deps and `effect:*` verification failures).

### 4.4 Optional Tracing & Diagnostics
- **REQ-OBS-9:** A shared event model feeds optional tracing/diagnostic sinks. Tracing can be toggled globally or per step occurrence.
- **REQ-OBS-10:** Tracing toggles must not alter execution semantics; enabling tracing cannot change plan shape or step behavior aside from emitting events.

## 5. Success Criteria

- Invalid recipes/configs are rejected before execution with detailed error payloads.
- Runtime dependency/contract violations surface immediately with clear step/tag context.
- Each run emits a deterministic run ID and plan fingerprint, and the `ExecutionPlan` can be inspected to explain scheduling/inputs.
- Tracing can be enabled/disabled without affecting outputs, and emits events through the shared model.

## 6. Dependencies & References

- `SPEC-target-architecture-draft.md` (observability baseline and validation semantics).  
- `PRD-target-task-graph-runtime.md` (plan compilation/execution).  
- `PRD-target-registry-and-tag-catalog.md` (metadata used for validation).  
- `PRD-target-context-and-dependency-contract.md` (dependency semantics enforced at runtime).
