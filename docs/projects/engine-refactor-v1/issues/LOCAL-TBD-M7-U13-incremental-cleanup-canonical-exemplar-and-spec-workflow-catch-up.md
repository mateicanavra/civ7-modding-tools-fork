---
id: LOCAL-TBD-M7-U13
title: "[M7] Pre-U14 cleanup: delete domain↔recipe shims + remove unknown-bag configs"
state: planned
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - SPEC-step-domain-operation-modules
  - ADR-ER1-030
  - ADR-ER1-034
  - ADR-ER1-035
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
This is the **prework issue for U14** (“hard path” strategy-centric ops + uniform envelope op config).

Scope is intentionally narrow to avoid overlap/conflict with U14’s large, repo-wide op/step/preset shape migration:
1) delete deprecated/incorrect **domain↔recipe shim exports** (tags/artifacts) and fix callsites,
2) remove **unknown-bag config** patterns (`UnknownRecord`, internal metadata) from domain configs and simplify config barrels while keeping `@mapgen/domain/config` stable,
3) run the single canonical guardrail gate and keep the repo green.

Former U13 slices about “canonical exemplar” and “schema spreading / op schema standardization” were moved to **post-U14** follow-up issue `LOCAL-TBD-M7-U15`.

---

## Context / starting point (do not “clean” it first)
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools-mapgen-domain-config`
- Branch: `chore/mapgen-domain-config-barrel`
- The working tree is intentionally dirty (in-flight config relocation + schema reshaping). Do not reset/revert/stash as part of this issue; branch slices will capture progress.

---

## Direction (canonical, effective immediately)
We are converging by removing obvious confusion/dead weight in small, green slices. SPEC/ADRs/workflows must follow real code (no aspirational divergence).

Non-negotiables:
- No new hidden dual paths, compatibility shims, or “legacy fallback” behavior inside scope.
- Prefer scorched-earth deletions and “around-the-block” cleanup within each slice.
- All “must run” guardrail checks are centralized in `scripts/lint/lint-domain-refactor-guardrails.sh`.

---

## Locked architecture decisions (hard rules)
These are enforceable rules. The implementation must converge to them; do not add optionality or alternate patterns.

### A) Domain boundary rule: domain must not depend on recipes
Domain code must not import recipe wiring or recipe-owned definitions:
- No imports from `mods/mod-swooper-maps/src/recipes/**` inside `mods/mod-swooper-maps/src/domain/**`.
- No `@mapgen/domain/tags.js` or `@mapgen/domain/artifacts.js` “recipe re-export shims” (delete them).
- Steps own runtime binding (adapter reads/writes, engine ID resolution, artifact publication).
- Ops are pure: `(input, config) => output` (POJO / typed arrays only).

### B) Config “unknown bag” removal (scorched earth within scope)
The `UnknownRecord` pattern (string-keyed `unknown` bag) is not part of the target architecture.
- Do not add new “unknown bag” fields to any domain config.
- This issue includes a slice to remove existing `UnknownRecord` usage from domain configs and delete the helper.

---

## Implementation slices (A/B/C/D)
Each slice is a Graphite-friendly unit:
- Branch from the current stack tip on this worktree.
- Keep each slice green (tests/checks).
- Scorched-earth cleanup inside the slice scope (delete dead exports/imports, update callsites).
- After each slice, do the SPEC/workflow catch-up step (below).

### Slice C — Delete domain↔recipe shims (tags/artifacts) and clean import edges
**Goal:** domain layer stops re-exporting recipe wiring and callsites stop importing those shims.

**Required work**
- Delete:
  - `mods/mod-swooper-maps/src/domain/tags.ts`
  - `mods/mod-swooper-maps/src/domain/artifacts.ts`
- Migrate all imports that referenced them to the correct owners:
  - recipe steps import recipe-owned tags directly from recipe modules,
  - engine artifact publication stays in steps/recipes (not domain).
- Ensure no domain file imports from recipe directories.

**Acceptance criteria**
- The deleted files are gone.
- No imports of `@mapgen/domain/tags.js` or `@mapgen/domain/artifacts.js` remain.
- Guardrails enforce the domain boundary rule (A3).

**Verification**
- `./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps check`

### Slice D — Config cleanup: remove UnknownRecord/internal metadata and simplify config barrels
**Goal:** eliminate “unknown bag” config fields and remove redundant config indirection while keeping step-facing imports stable.

**Required work**
- Remove `UnknownRecord` and `INTERNAL_METADATA_KEY` from `mods/mod-swooper-maps/src/domain/config-common.ts` by:
  - deleting the exports,
  - replacing all callsites with explicit schemas and/or eliminating the internal-only fields entirely.
- Ensure domain configs are strongly typed (no new open-ended knobs in domain layer).
- Ensure the canonical step-facing config entrypoint remains: `@mapgen/domain/config`.
- Remove now-dead config layers (do not add new barrels to “paper over” import paths).

**Acceptance criteria**
- No `UnknownRecord` usage remains in domain config schemas.
- No internal-only config fields remain in domain config schemas.
- Step config imports remain stable and point at `@mapgen/domain/config`.

**Verification**
- `./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps check`

---

## SPEC/ADR/workflow catch-up (required after each slice)
After each slice branch is green:
- Update SPEC/workflow docs to reflect *exactly* what the code now does.
- Do not duplicate “must run” raw `rg` search lists in docs; the single canonical gate is `scripts/lint/lint-domain-refactor-guardrails.sh`.

Minimum doc updates per slice:
- Update the relevant SPEC section(s) to codify:
  - domain boundary (A),
  - config barrel entrypoint expectations (`@mapgen/domain/config`),
  - removal of unknown-bag config patterns (B).
- Update the workflow packet under `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/**` to:
  - reference the guardrail script as the gate,
  - remove/avoid dense inlined “required grep lists”.

---

## Next agent prompt (copy/paste)
You are working in:
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools-mapgen-domain-config`
- Branch: `chore/mapgen-domain-config-barrel` (dirty by design).

Mission:
Implement LOCAL-TBD-M7-U13 end-to-end as **pre-U14 cleanup** via slices C/D with Graphite:
1) Slice C: delete domain↔recipe shims (`domain/tags.ts`, `domain/artifacts.ts`) and fix all callsites; enforce domain boundary.
2) Slice D: remove `UnknownRecord` + internal metadata fields from domain config schemas; simplify config barrels while keeping `@mapgen/domain/config` stable.

Hard rules:
- Do not introduce new patterns or optionality.
- Do not attempt to standardize op schema/authoring shapes here; that overlaps with U14.
- Scorched earth within slice scope; do around-the-block cleanup.
- Centralize “must run” checks in `scripts/lint/lint-domain-refactor-guardrails.sh` (update it as needed).

Verification (end of each slice, and again at the end):
- `./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C mods/mod-swooper-maps build`
- `pnpm deploy:mods`

Docs:
After each slice is green, update SPEC/workflow docs to match reality; point to the exemplar and the guardrail script as the canonical gate.
