---
id: LOCAL-TBD-M7-B
title: "[M7] Authoring surface upgrades"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: null
children:
  - LOCAL-TBD-M7-B1
  - LOCAL-TBD-M7-B2
  - LOCAL-TBD-M7-B3
  - LOCAL-TBD-M7-B4
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Upgrade the public authoring surface so the target architecture can be adopted without ad-hoc conventions. This workstream makes step ids uniform, stages the authoritative config surface owner, domain registries explicit, and op normalization compile-time only.

## Deliverables

This workstream delivers authoring surface upgrades:

- **B1:** Step id convention: kebab-case enforced
- **B2:** Stage Option A: public+compile with computed surfaceSchema
- **B3:** Domain ops registries + binding helpers (compile vs runtime)
- **B4:** Op normalization hook semantics: resolveConfig -> normalize

## Child Issues

| ID | Title | Status | blocked_by |
|---|---|---|---|
| [LOCAL-TBD-M7-B1](./LOCAL-TBD-M7-B1-step-id-kebab-case.md) | Step id convention: kebab-case enforced | planned | [] |
| [LOCAL-TBD-M7-B2](./LOCAL-TBD-M7-B2-stage-option-a.md) | Stage Option A: public+compile with computed surfaceSchema | planned | [] |
| [LOCAL-TBD-M7-B3](./LOCAL-TBD-M7-B3-domain-ops-registries.md) | Domain ops registries + binding helpers | planned | [] |
| [LOCAL-TBD-M7-B4](./LOCAL-TBD-M7-B4-op-normalize-semantics.md) | Op normalization hook semantics: resolveConfig -> normalize | planned | [] |

## Sequencing

B1, B2, B3, B4 can be worked in parallel. No internal dependencies within this workstream.

## Acceptance Criteria

- [ ] All child issues (B1, B2, B3, B4) are completed
- [ ] Authoring factories enforce kebab-case and reserved key rules
- [ ] No engine behavior changes yet

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes

- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

This is a parent/index issue. Implementation details live in child issue docs.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Child Issues](#child-issues)
- [Sequencing](#sequencing)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
