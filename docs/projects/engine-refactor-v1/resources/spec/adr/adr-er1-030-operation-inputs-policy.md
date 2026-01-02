---
id: ADR-ER1-030
title: "Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy)"
status: accepted
date: 2025-12-30
project: engine-refactor-v1
risk: stable
system: mapgen
component: authoring-sdk
concern: domain-operation-modules
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-core-sdk"
  - "SPEC-pending-step-domain-operation-modules"
---

# ADR-ER1-030: Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy)

## Context

The step/domain-operation module design introduces a reusable “domain operation” layer. The most consequential coupling point is the operation input surface:
- whether domain operations consume plain data (buffers/POJOs) vs callback “views” into runtime state,
- how typed-array buffers are represented in schemas (if at all),
- where runtime extraction/normalization happens (step glue vs domain library).

## Decision

- Domain operations consume **plain data inputs** (POJOs + typed arrays) and return plain data outputs. They do not receive callback “views” into runtime state as part of their primary contract.
- Any runtime “view” helpers are step-local implementation details used to *build* operation inputs; they are not part of the domain operation’s exported surface.
- Typed-array buffers are treated as first-class runtime values, but schema representation is intentionally conservative:
  - schemas may use coarse shapes for typed arrays (or `Type.Any()` where necessary),
  - correctness-critical buffer invariants (length, required allocation, element-type expectations) are enforced via explicit step/domain validators rather than pretending JSON schema can fully express typed arrays.

## Options considered

1. **Buffers/POJOs only**
   - Pros: deterministic, testable, portable; minimizes hidden runtime coupling
   - Cons: step glue must extract/precompute inputs; may allocate memory
2. **Callback “views” into runtime**
   - Pros: less boilerplate and potentially lower memory overhead
   - Cons: implicit coupling to runtime state; harder to test and reason about determinism
3. **Two-tier model** (core ops take buffers; convenience ops accept views)
   - Pros: balances ergonomics/performance
   - Cons: introduces two surfaces and increases doc/tooling complexity

## Consequences

- Domain libraries remain engine-agnostic and unit-test-friendly by default.
- Performance-sensitive cases must be handled explicitly (e.g., by changing which buffers are materialized, or by introducing a deliberate “view surface” as a separate design—without silently changing the default contract).
- Schema tooling may require small helpers later, but the target architecture does not depend on schema precision for typed arrays.

## Decision / Outcome (decided)

### 1) Decision (locked)

- **No runtime “views” in operation contracts (hard rule):**
  - operation inputs/outputs **must not** include adapters, callbacks, or other runtime/engine readback surfaces.
  - This applies to **all** operations (exported or not) so “ops are contracts” remains uniform.
- **Allowed contract value families (POJO-ish):**
  - plain JSON-ish values (primitives, arrays, plain objects),
  - typed arrays used as dense grid fields, at minimum:
    - `Uint8Array`
    - `Int32Array`
    - `Float32Array`
  - **Candidate observed in ecology (called out explicitly, not silently expanded):**
    - `Int16Array` (used for elevation fields today).
- **Typed-array schema strategy (default):** represent typed-array fields using **coarse TypeBox schemas** (typically `Type.Unsafe<...>(...)` with descriptive metadata), and enforce correctness-critical invariants with **explicit validators**.
- **Typed-array validation strategy (required):** typed arrays and their invariants are validated by code we own (not “just the schema”):
  - element-type expectation (e.g., “this is `Float32Array`”),
  - shape invariants (e.g., `buffer.length === width * height`),
  - any additional coupling invariants (shared width/height, sentinel ranges, etc.).

### 2) Homework result: `Type.Refine(...)` vs `Type.Unsafe<...>(...)` (TypeBox 1.0.61)

This repo uses TypeBox `typebox@1.0.61`. In that version:

- `Type.Refine(...)` stores the refinement under a non-enumerable `~refine` property (containing a function).
  - **Consequence:** JSON serialization (e.g., `JSON.stringify(schema)`) drops `~refine` entirely, so the emitted JSON schema does **not** carry the refinement.
  - That makes `Refine` **non-portable** as JSON schema: the extra validation logic only exists in-process, inside this codebase.
- `Type.Unsafe<...>(...)` is primarily a TypeScript typing tool:
  - it allows `Static<typeof schema>` to be a non-JSON value (like `Uint8Array`) without requiring TypeBox to “understand” the runtime representation.
  - it **can** serialize the enumerable metadata you provide (e.g., `description`), but it does not provide a portable, standards-based JSON schema representation of typed arrays.

Implication for this architecture:
- `Refine` can add useful **in-process runtime checks**, but does not improve the **portable JSON schema** surface.
- `Unsafe` keeps schemas more stable/serializable (metadata-only) without embedding function-backed validation into schemas.
- Either way, meaningful typed-array validation and invariants are enforced by **explicit validators** we control.

Decision consequence:
- **Default to `Type.Unsafe` + explicit validators** for typed arrays.
- `Type.Refine` remains an **optional, internal** technique (e.g., for local runtime checks in tests or tooling) when we explicitly accept that it will not survive schema serialization.

### 3) Validation placement (now vs intended)

- **Primary enforcement location:** step input-builders (`inputs.ts`) validate and materialize plain inputs (including buffers) before calling ops. This is where contextual shape parameters (width/height, grid conventions) are naturally available.
- **Reusable validator intent:** typed-array and invariant validators should be written so they can be reused by:
  - step input-builders (runtime),
  - direct unit tests of ops (fixtures),
  - and (later) optional op-entry validation for defensive usage.
- **No over-promise:** today, the core authoring helper (`createOp`) does not automatically validate operation inputs/outputs at runtime; adding first-class runtime op validation is intended, but the exact mechanism/rollout is separate from this contract decision.
