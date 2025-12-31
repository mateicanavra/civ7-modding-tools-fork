---
id: ADR-ER1-007
title: "Foundation surface is artifact-based; M4 uses monolithic `artifact:foundation` (split deferred per DEF-014)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: at_risk
supersedes: []
superseded_by: null
updates:
  - "2025-12-23: M4 keeps the foundation payload monolithic but moves it onto the artifacts surface (`artifact:foundation` at `ctx.artifacts.foundation`) and removes `ctx.foundation`. The split into `artifact:foundation.*` sub-artifacts remains deferred (DEF-014)."
sources:
  - "SPEC-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Scope + parent issues)"
  - "CIV-62-M4-FOUNDATION-SURFACE-CUTOVER (implementation ownership)"
---

# ADR-ER1-007: Foundation surface is artifact-based; M4 uses monolithic `artifact:foundation` (split deferred per DEF-014)

## Context

M2 established a stable slice contract centered on `ctx.foundation`/`FoundationContext`, while the target architecture requires artifact-based contracts. M4 must align external surfaces without taking on the heavier “split foundation into many artifacts” refactor.

## Decision

- **M4 contract:** foundation is a monolithic artifact:
  - dependency tag: `artifact:foundation`
  - canonical storage: `context.artifacts.foundation`
  - `ctx.foundation` is removed as a top-level surface.
- **Post-M4 end-state (DEF-014):** foundation is represented as discrete `artifact:foundation.*` products and the monolithic `artifact:foundation` dependency is removed once consumers migrate.
- Storage layout is still decided: the foundation namespace lives under `context.artifacts.foundation` (M4 monolith examples: `.plates`, `.dynamics`; post-M4 split examples: `.mesh` and peers). M4 keeps the payload monolithic; the split into separately-tagged sub-artifacts is explicitly deferred.

## Consequences

- New work must not add dependencies on `ctx.foundation.*` (disallowed surface).
- In M4, new work that depends on foundation must depend on `artifact:foundation` (monolithic) via `ctx.artifacts`.
- DEF-014 tracks the post-M4 split into discrete `artifact:foundation.*` artifacts and the follow-on consumer migration.
