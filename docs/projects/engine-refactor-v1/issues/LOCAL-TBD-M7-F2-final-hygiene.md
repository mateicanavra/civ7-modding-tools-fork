---
id: LOCAL-TBD-M7-F2
title: "[M7] Final hygiene + enforcement tightening"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [technical-debt]
parent: LOCAL-TBD-M7-F
children: []
blocked_by:
  - LOCAL-TBD-M7-F1
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

This is where enforcement becomes real: tighten import boundaries, finalize naming (`settings` -> `env`), and align docs/spec references to the final code reality.

## Deliverables

- Lint boundaries updated to forbid compiler-only imports from runtime paths.
- Docs/spec references updated to match the final code reality.
- Spot-check: no remaining resolveConfig naming or runtime Value.Default usage.
- Rename `settings` -> `env` and move Env schema/type to core (delete legacy naming; no long-lived alias).

## Acceptance Criteria

- [ ] Import boundaries match `06-enforcement.md` (domain entrypoint-only; no deep imports).
- [ ] `settings` is renamed to `env` and `Env` type/schema lives in core (no long-lived alias).
- [ ] Repo guardrails pass (lint + tests) and drift checks are in place.

## Scope Boundaries

**In scope:**
- Renaming `settings` -> `env` across runtime request types, context fields, and call sites.
- Relocating the runtime envelope schema/type to core as `EnvSchema`/`Env` per the target spec.
- Tightening lint boundaries to prevent compiler-only imports from runtime paths and prevent deep imports into domain internals.

**Out of scope:**
- Broad refactors unrelated to recipe-compile cutover; enforcement is scoped to the surfaces referenced by `06-enforcement.md`.

## Testing / Verification

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm lint:domain-refactor-guardrails`

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/engine/execution-plan.ts` | Baseline location of RunSettingsSchema/RunSettings; target state is EnvSchema/Env with engine importing core. |
| `/packages/mapgen-core/src/authoring/recipe.ts` | Rename settings parameter/plan threading to env per the recipe module target contract. |
| `/mods/mod-swooper-maps/src/recipes/standard/**` | Update recipe/run wiring and any step reads from context.settings -> context.env. |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/foundation/**` | Known baseline user of context.settings.directionality; must migrate to env. |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` | Canonical Env module + naming (RunSettings -> Env; settings -> env). |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
