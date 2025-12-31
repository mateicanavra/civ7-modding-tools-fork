# ADR Log (Spec)

This log tracks decisions that are adjacent to the target architecture spec and should not live inside the canonical spec itself.

## How to use

- Add new ADR entries as separate files in this directory.
- Link each ADR here with a one-line summary and date.

## Relationship to other ADR logs

- Canonical accepted decisions for the project live in the Engine Refactor v1 ADR register (ADR-ER1-###).
- This directory is for spec-adjacent decisions that are still being converged (typically `Status: Proposed`) and will later be promoted or superseded.

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

- 2025-12-31 — ADR-ER1-027 — Dependency terminology and registry naming.
- 2025-12-31 — ADR-ER1-028 — Dependency key ownership model.
- 2025-12-31 — ADR-ER1-029 — Mutation modeling policy (`buffer:*` vs `artifact:*`).
- 2025-12-31 — ADR-ER1-030 — Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy).
- 2025-12-31 — ADR-ER1-031 — Strategy config encoding.
- 2025-12-31 — ADR-ER1-032 — Recipe config authoring surface (no global overrides).
- 2025-12-31 — ADR-ER1-033 — Step schema composition.
- 2025-12-31 — ADR-ER1-034 — Operation kind semantics.
- 2025-12-31 — ADR-ER1-035 — Config normalization and derived defaults.
