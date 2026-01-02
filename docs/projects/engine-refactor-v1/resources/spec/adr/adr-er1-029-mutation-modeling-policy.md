---
id: ADR-ER1-029
title: "Mutation modeling policy (`buffer:*` vs `artifact:*`)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: engine-runtime
concern: mutation-model
supersedes: []
superseded_by: null
sources:
  - "Engine Refactor v1 ADR register (ADR-ER1-###)"
  - "SPEC-architecture-overview"
  - "SPEC-tag-registry"
  - "SPEC-step-domain-operation-modules"
---

# ADR-ER1-029: Mutation modeling policy (`buffer:*` vs `artifact:*`)

## Context

The architecture uses dependency keys to model cross-step coupling. We need a single, stable interpretation of:
- what is mutable vs immutable,
- what counts as a schedulable dependency surface,
- how steps communicate writes and verified side effects.

The project ADR register calls out this as a follow-up decision area (buffer mutable canvases vs artifact immutable products).

## Decision

- `buffer:*` keys represent **mutable runtime canvases** (typically engine-facing typed arrays) that can be read and written across steps.
- `artifact:*` keys represent **immutable published products**: once published in a run, they are treated as read-only inputs to downstream steps.
- Steps may “publish” new artifacts, but a published artifact is not subsequently mutated in-place as part of the contract surface.
- `effect:*` keys represent **verified milestones** that may be schedulable dependencies, but they are not data surfaces.

## Options considered

1. **All data is an artifact** (including mutable canvases)
   - Pros: uniform surface
   - Cons: blurs mutation semantics and makes “who wrote what” hard to reason about
2. **Buffers for mutation, artifacts for products** (typed semantics)
   - Pros: makes mutation explicit; aligns with engine-facing realities
   - Cons: requires discipline around buffer allocation/ownership and artifact immutability
3. **Opaque state with effects only** (avoid explicit mutation modeling)
   - Pros: less surface to define
   - Cons: loses determinism/validation leverage and makes composition fragile

## Consequences

- Contract schemas should distinguish between:
  - buffer existence/shape validation (allocation, length, element type invariants), and
  - artifact validation (schema validation, content invariants, demo payloads).
- Operation/module design should treat “inputs” as value snapshots derived from buffers/artifacts, and treat writes as explicit buffer writes and/or artifact publication.
