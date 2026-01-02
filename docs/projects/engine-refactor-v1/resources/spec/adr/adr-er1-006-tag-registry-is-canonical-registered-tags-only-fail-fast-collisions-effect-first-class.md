---
id: ADR-ER1-006
title: "Tag registry is canonical (registered tags only; fail-fast collisions; `effect:*` first-class)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
system: mapgen
component: engine-runtime
concern: dependency-registry
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Triage “Registry + Tag Language Gaps”)"
---

# ADR-ER1-006: Tag registry is canonical (registered tags only; fail-fast collisions; `effect:*` first-class)

## Context

M3 relied on a fixed allowlist/regex validation in a core-owned tag allowlist module and executor hard-coded verification lists; this is not safe or extensible for mods.

## Decision

- Each mod instantiates a registry that is the canonical catalog for:
  - tags (`artifact:*`, `buffer:*`, `effect:*`)
  - steps (and their config schemas)
- Tags/steps are only valid if registered; unknown tag references are hard errors.
- Duplicate tag IDs and duplicate step IDs are hard errors at registry build time.
- Demo payloads are optional; if present, they must be schema-valid and safe defaults.
- `effect:*` is a first-class namespace in the registry and may be used in `requires/provides`.

## Consequences

- Replace allowlist/regex tag validation and any executor hard-coded “verified provides” lists with registry-driven validation/verification.
