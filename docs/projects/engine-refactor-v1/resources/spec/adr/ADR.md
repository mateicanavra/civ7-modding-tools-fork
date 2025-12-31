# ADR Log (Spec)

This log tracks decisions that are adjacent to the target architecture spec and should not live inside the canonical spec itself.

## How to use

- Add new ADR entries as separate files under `docs/projects/engine-refactor-v1/resources/spec/adr/`.
- Link each ADR here with a one-line summary and date.

## Relationship to other ADR logs

- Canonical accepted decisions for the project live in `docs/projects/engine-refactor-v1/ADR.md`.
- This directory is for spec-adjacent decisions that are still being converged (typically `Status: Proposed`) and will later be promoted or superseded.

## Gap map (what is still not fully defined)

This is a compact “where are the real gaps?” map; it is not authoritative content. The spec files under `docs/projects/engine-refactor-v1/resources/spec/` remain the canonical target architecture surface.

| Area | Decision | Status | Depends on | Spec touchpoints |
|------|----------|--------|------------|----------------|
| Spine | Dependency terminology + registry naming | Proposed | — | `SPEC-architecture-overview.md`, `SPEC-tag-registry.md`, `SPEC-pending-step-domain-operation-modules.md` |
| Spine | Dependency key ownership model (domain vs recipe) | Proposed | Dependency terminology + registry naming | `SPEC-architecture-overview.md`, `SPEC-packaging-and-file-structure.md`, `SPEC-tag-registry.md`, `SPEC-pending-step-domain-operation-modules.md` |
| Spine/Boundary | Mutation modeling policy (`buffer:*` vs `artifact:*`) | Proposed | Dependency key ownership model | `SPEC-architecture-overview.md`, `SPEC-tag-registry.md`, `SPEC-core-sdk.md`, `SPEC-pending-step-domain-operation-modules.md` |
| Domain boundary | Operation inputs policy (buffers/POJOs vs views; typed-array schema strategy) | Proposed | Mutation modeling policy | `SPEC-pending-step-domain-operation-modules.md`, `SPEC-core-sdk.md` |
| Domain authoring | Strategy config encoding (strategy selection + defaults) | Proposed | Operation inputs policy | `SPEC-pending-step-domain-operation-modules.md` |
| Domain authoring | Recipe config surface (no global overrides; explicitness rules) | Proposed | Strategy config encoding | `SPEC-architecture-overview.md`, `SPEC-packaging-and-file-structure.md`, `SPEC-pending-step-domain-operation-modules.md` |
| Domain authoring | Step schema composition approach (manual vs declarative op wiring) | Proposed | Recipe config surface | `SPEC-architecture-overview.md`, `SPEC-packaging-and-file-structure.md`, `SPEC-pending-step-domain-operation-modules.md` |
| Domain semantics | Operation kind semantics (`plan`/`compute`/`score`/`select`) | Proposed | — | `SPEC-pending-step-domain-operation-modules.md` |
| Compile/validate | Config normalization beyond schema defaults | Proposed | Recipe config surface | `SPEC-architecture-overview.md`, `SPEC-pending-step-domain-operation-modules.md` |
| Narrative debug | Overlays as derived-only vs dependency surface | Accepted | — | See `docs/projects/engine-refactor-v1/ADR.md` |
| Runtime boundary | Directionality source of truth (`RunRequest.settings`) | Accepted | — | See `docs/projects/engine-refactor-v1/ADR.md` |

## ADR index

- 2025-12-31 — `adr-er1-027-dependency-terminology-and-registry-naming.md` — Retire overloaded “tag” terminology in favor of dependency keys; define registry naming target.
- 2025-12-31 — `adr-er1-028-dependency-key-ownership-model.md` — Decide where dependency keys and their definitions “live” (domain vs recipe vs registry).
- 2025-12-31 — `adr-er1-029-mutation-modeling-policy.md` — Decide how mutations are modeled (`buffer:*` mutable canvases vs `artifact:*` immutable products).
- 2025-12-31 — `adr-er1-030-operation-inputs-policy.md` — Decide operation inputs policy (buffers/POJOs vs runtime views; typed-array schema approach).
- 2025-12-31 — `adr-er1-031-strategy-config-encoding.md` — Decide strategy selection/config encoding and default semantics.
- 2025-12-31 — `adr-er1-032-recipe-config-authoring-surface.md` — Decide what configuration the recipe can author and what is forbidden (no global overrides).
- 2025-12-31 — `adr-er1-033-step-schema-composition.md` — Decide how step schemas are authored/composed (manual vs declarative op wiring).
- 2025-12-31 — `adr-er1-034-operation-kind-semantics.md` — Define the meaning of operation kinds and what (if anything) is enforced.
- 2025-12-31 — `adr-er1-035-config-normalization-and-derived-defaults.md` — Decide how derived defaults/config normalization works in compile/validation.
