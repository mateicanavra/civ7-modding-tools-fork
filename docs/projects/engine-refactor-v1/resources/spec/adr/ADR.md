---
doc_id: ER1-ADR-INDEX
title: "Engine Refactor v1 — ADR Index"
project: engine-refactor-v1
status: active
---

# ADR Index

This log tracks decisions that are adjacent to the target architecture spec and should not live inside the canonical spec itself.

## How to use

- Add new ADR entries as separate files in this directory.
- Link each ADR here with a one-line summary.

## Relationship to other ADR logs

- This directory is for spec-adjacent decisions that are still being converged (typically `Status: proposed`) and will later be promoted, superseded, or rejected.
- Historical ADRs live as individual files (`ADR-ER1-###`); a legacy compiled register exists as `ER1-ADR-REGISTER-ARCHIVE` and is not authoritative.
- Archived/noise ADRs are listed below and live under this index as `ADR-ER1-###` files (with `archived: true` in frontmatter).

## Gap map (what is still not fully defined)

This is a compact “where are the real gaps?” map; it is not authoritative content. The canonical target architecture remains the split SPEC component set.

| Area | Decision | Status | Depends on | Touchpoints (Doc IDs) |
|------|----------|--------|------------|------------------------|
| Spine | Dependency terminology + registry naming | Proposed | — | SPEC-architecture-overview; SPEC-tag-registry; SPEC-pending-step-domain-operation-modules |
| Spine | Dependency key ownership model (domain vs recipe) | Proposed | Dependency terminology + registry naming | SPEC-architecture-overview; SPEC-packaging-and-file-structure; SPEC-tag-registry; SPEC-pending-step-domain-operation-modules |
| Spine/Boundary | Mutation modeling policy (`buffer:*` vs `artifact:*`) | Proposed | Dependency key ownership model | SPEC-architecture-overview; SPEC-tag-registry; SPEC-core-sdk; SPEC-pending-step-domain-operation-modules |
| Domain boundary | Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy) | Proposed | Mutation modeling policy | SPEC-pending-step-domain-operation-modules; SPEC-core-sdk |
| Domain authoring | Strategy config encoding (strategy selection + defaults) | Proposed | Operation inputs policy | SPEC-pending-step-domain-operation-modules |
| Domain authoring | Recipe config surface (no global overrides; explicitness rules) | Proposed | Strategy config encoding | SPEC-architecture-overview; SPEC-packaging-and-file-structure; SPEC-pending-step-domain-operation-modules |
| Domain authoring | Step schema composition approach (manual vs declarative op wiring) | Proposed | Recipe config surface | SPEC-architecture-overview; SPEC-packaging-and-file-structure; SPEC-pending-step-domain-operation-modules |
| Domain semantics | Operation kind semantics (`plan`/`compute`/`score`/`select`) | Proposed | — | SPEC-pending-step-domain-operation-modules |
| Compile/validate | Config normalization beyond schema defaults | Proposed | Recipe config surface | SPEC-architecture-overview; SPEC-pending-step-domain-operation-modules |
| Narrative debug | Overlays as derived-only vs dependency surface | Accepted | — | ADR-ER1-025 |
| Runtime boundary | Directionality source of truth (`RunRequest.settings`) | Accepted | — | ADR-ER1-019 |

## ADR index

- ADR-ER1-001 — Ordering source of truth is recipe-only (no `STAGE_ORDER` / `stageManifest`).
- ADR-ER1-002 — Enablement is recipe-authored and compiled (no `shouldRun`, no silent skips).
- ADR-ER1-003 — Pipeline boundary is `RunRequest = { recipe, settings }` compiled to `ExecutionPlan`.
- ADR-ER1-004 — The standard pipeline is packaged as a mod-style package (not hard-wired).
- ADR-ER1-005 — Presets are removed; canonical entry is explicit recipe + settings selection.
- ADR-ER1-006 — Tag registry is canonical (registered tags only; fail-fast collisions; `effect:*` first-class).
- ADR-ER1-007 — Foundation surface is artifact-based; M4 uses monolithic `artifact:foundation` (split deferred per DEF-014).
- ADR-ER1-008 — Narrative/playability contract is story entry artifacts by motif; views derived; no `StoryTags`; no narrative globals.
- ADR-ER1-009 — Engine boundary is adapter-only + reification-first; `state:engine.*` is transitional-only; verified `effect:*` is schedulable.
- ADR-ER1-010 — Climate ownership is TS-canonical `artifact:climateField` (engine reads fenced; DEF-010 is post-M4 reification).
- ADR-ER1-011 — Placement consumes explicit `artifact:placementInputs@v1` (implementation deferred per DEF-006).
- ADR-ER1-012 — Observability baseline is required (runId + plan fingerprint + structured errors); rich tracing is optional and toggleable.
- ADR-ER1-014 — Core principles (TaskGraph pipeline, context-owned state, offline determinism).
- ADR-ER1-015 — Hydrology river product is `artifact:riverAdjacency` for now (DEF-005 defers `artifact:riverGraph`).
- ADR-ER1-016 — Pure-target non-goals (no compatibility guarantees, no migration shims in the spec).
- ADR-ER1-017 — V1 explicit deferrals (schema must allow future expansion without breaking changes).
- ADR-ER1-019 — Cross-cutting directionality policy is RunRequest settings (not per-step config duplication).
- ADR-ER1-020 — `effect:engine.placementApplied` is verified via a minimal TS-owned `artifact:placementOutputs@v1`.
- ADR-ER1-021 — `effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` are verified via cheap invariants + call evidence; adapter read-back APIs are deferred.
- ADR-ER1-022 — Plan fingerprint excludes observability toggles (semantic fingerprint only).
- ADR-ER1-024 — Hotspot categories live in a single narrative hotspots artifact (no split artifacts in v1).
- ADR-ER1-025 — `ctx.overlays` remains a non-canonical derived debug view (story entry artifacts are canonical).
- ADR-ER1-026 — Landmass/ocean separation do not rely on `foundation.surface/policy` aliases (recipe config is authoritative).
- ADR-ER1-027 — Dependency terminology and registry naming.
- ADR-ER1-028 — Dependency key ownership model.
- ADR-ER1-029 — Mutation modeling policy (`buffer:*` vs `artifact:*`).
- ADR-ER1-030 — Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy).
- ADR-ER1-031 — Strategy config encoding (selection + defaults + explicitness).
- ADR-ER1-032 — Recipe config authoring surface (no global overrides).
- ADR-ER1-033 — Step schema composition.
- ADR-ER1-034 — Operation kind semantics.
- ADR-ER1-035 — Config normalization and derived defaults.

## Archived/noise decisions (do not treat as current design)

These decisions were milestone- or implementation-tactic specific and should not be used to drive current architecture work:

- ADR-ER1-013 (M4 execution decisions)
- ADR-ER1-018 (decision promotion plan)
- ADR-ER1-023 (demo payload “starts” guidance)
