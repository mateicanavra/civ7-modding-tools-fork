# Spec (Project Resources)

This directory contains spec-adjacent documents for the `engine-refactor-v1` project.

**Notation:**
- `CORE_SDK_ROOT`, `STANDARD_CONTENT_ROOT`, and `MOD_CONTENT_ROOT` are conceptual roots used to describe ownership and target layouts (do not treat them as stable repo filesystem paths).

**Canonical target architecture (SSOT):**
- SPEC-architecture-overview (entrypoint)
- The full component set in this `SPEC-*` directory

**Component splits (derived from the canonical spec):**
- SPEC-architecture-overview
- SPEC-packaging-and-file-structure
- SPEC-tag-registry
- SPEC-core-sdk
- SPEC-standard-content-package
- SPEC-global-invariants
- SPEC-appendix-target-trees

**Pending-merge specs (not canonical until merged):**
- SPEC-pending-step-domain-operation-modules

**ADR log:**
- ADR index: `ER1-ADR-INDEX`

## How these pieces fit together

Start with SPEC-architecture-overview, then drill into the component specs as needed. Use this set as the SSOT target architecture.

Cross-cutting concerns live in SPEC-architecture-overview (principles, pipeline contract, context shape, dependency tags, phase ownership, narrative model, observability). The packaging, registry, core SDK, and standard content package docs detail how those cross-cutting decisions are applied in concrete layouts and responsibilities. Global invariants and the appendix provide diffable rules and full target trees to validate implementations.
