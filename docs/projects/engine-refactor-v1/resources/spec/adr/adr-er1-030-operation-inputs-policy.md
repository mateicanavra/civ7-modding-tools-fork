---
id: ADR-ER1-030
title: "Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
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
