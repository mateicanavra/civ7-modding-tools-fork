# ADR-ER1-034: Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)

**Status:** Proposed
**Date:** 2025-12-31

## Context

The step/domain-operation module design introduces operation “kinds” such as `plan`, `compute`, `score`, and `select`. Without a shared meaning, these labels become decorative and can’t support tooling, review, or invariants.

## Decision

- Operation kind is a **semantic classification** used for documentation and optional static validation/tooling.
- Kinds carry the following intent:
  - `compute`: deterministic pure computation from inputs to outputs (no runtime writes)
  - `score`: produces scoring outputs from inputs (no runtime writes)
  - `select`: selects among candidates using scores/rules (no runtime writes)
  - `plan`: produces an execution/placement plan or decisions that will later be applied by a step (still no runtime writes)
- Runtime enforcement is not required for v1; any enforcement is lint-level and opt-in.

## Options considered

1. **No kinds**
   - Pros: avoids bikeshedding
   - Cons: loses shared language and review structure
2. **Kinds as docs-only labels**
   - Pros: simple; minimal coupling
   - Cons: easy to misuse without guardrails
3. **Kinds with enforced invariants**
   - Pros: strong guarantees
   - Cons: higher implementation cost and risk of over-constraining early design

## Consequences

- Operation contracts can remain stable and testable while still gaining a shared vocabulary for intent.
- If enforcement becomes desirable, it can be added later as tooling/lint without changing operation signatures.

## Sources

- SPEC-pending-step-domain-operation-modules
