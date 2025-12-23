# PRD: Target Context & Dependency Contract (Fields, Artifacts, Satisfaction)

## 1. Purpose

Define the end-state `MapGenContext` shape, storage layout, and dependency satisfaction semantics required by the target architecture. This PRD captures the decisions in `SPEC-target-architecture-draft.md` §1.3–§1.5 about how steps read/write state, how dependencies are validated, and how foundation storage is organized.

## 2. Scope

**In scope**
- Context ownership of fields, artifacts, settings, and runtime surface.
- Storage layout for foundation artifacts (and prohibition on monolithic `FoundationContext` surfaces).
- Dependency satisfaction rules (explicit `provides`/initial sets, no implicit satisfaction from allocation).

**Out of scope**
- Recipe/ExecutionPlan compilation (see `PRD-target-task-graph-runtime.md`).
- Registry/tag inventory (see `PRD-target-registry-and-tag-catalog.md`).
- Observability outputs and diagnostics (see `PRD-target-observability-and-validation.md`).

## 3. Goals

1) All state lives in `MapGenContext`; no globals or hidden engine surfaces.  
2) Dependencies are satisfied explicitly via `provides` plus explicit initial sets; buffer allocation alone never satisfies tags.  
3) Foundation storage is discrete artifacts under `context.artifacts.foundation.*`, not a monolithic `FoundationContext`.

## 4. Requirements

### 4.1 Context Shape & Ownership
- **REQ-CTX-1:** `MapGenContext` owns four domains: `fields` (mutable buffers), `artifacts` (immutable/versioned intermediates), `settings` (validated run-wide inputs), and `runtime` (adapter I/O surface).
- **REQ-CTX-2:** Step-local config is not stored globally; it is carried per occurrence in the `ExecutionPlan`.
- **REQ-CTX-3:** Engine/adapter interactions are surfaced via `runtime` and/or `effect:*` tags; engine usage is optional for offline determinism.

### 4.2 Storage Layout
- **REQ-CTX-4:** Foundation artifacts are stored discretely under `context.artifacts.foundation.*` (mesh, crust, plateGraph, tectonics). New work must not depend on `ctx.foundation` or other monolithic blobs.
- **REQ-CTX-5:** Other artifacts/fields are stored under `context.artifacts.*` and `context.fields.*` keyed by their tags; tag IDs remain the dependency language (no blob dependencies).

### 4.3 Dependency Satisfaction Semantics
- **REQ-CTX-6:** Dependency satisfaction is tracked explicitly by execution state: a tag is satisfied only if it is in the initial satisfied set or was provided by a completed step occurrence.
- **REQ-CTX-7:** Preallocated buffers do **not** satisfy `field:*` dependencies. For M4 baseline, no `field:*` tags are initially satisfied; future initial sets must be added deliberately with documented triggers.
- **REQ-CTX-8:** Missing dependencies at execution time are hard errors (fail fast). Runtime capability/precondition checks must be explicit (no silent skips).

## 5. Success Criteria

- Steps exclusively read/write through `MapGenContext` domains; no code paths rely on global state or implicit engine buffers.
- Foundation consumers access discrete artifacts (`context.artifacts.foundation.mesh`, etc.), and no new dependency is expressed as `ctx.foundation`.
- Execution tracks satisfied tags explicitly; a step that does not declare a `provides` cannot make a tag available.
- Dependency validation failures surface as structured errors before step execution.

## 6. Dependencies & References

- `SPEC-target-architecture-draft.md` §1.3–§1.5.  
- `PRD-target-registry-and-tag-catalog.md` (tags that map into context storage).  
- `PRD-target-task-graph-runtime.md` (executor enforces satisfaction rules).
