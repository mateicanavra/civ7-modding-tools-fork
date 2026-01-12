---
name: domain-refactor-implementation-subflow
description: |
  Detailed implementation sub-flow for refactoring a domain to operation modules.
  Focuses on slice planning + slice completion checklist + sizing guardrails.
---

# SUB-FLOW: Domain Refactor Implementation (Slices)

This is the detailed “how-to” for the **implementation phase** of a domain refactor.

This sub-flow assumes you already produced:
- a domain inventory (all callsites, contracts, config surfaces, typed arrays, deletions), and
- a locked op catalog (ids, kinds, schema ownership, config resolution plan).

## How to think about slicing (guardrails)

You (the implementer) choose slices **ad hoc** based on the domain inventory. The workflow is not prescriptive about slice boundaries, but it is strict about slice **completion** (no half-migrations).

Hard guardrails:
- Preserve step granularity. Do not “collapse” multiple legacy steps into one mega-step to make the refactor easier.
- Preserve op granularity. Avoid noun-first “bucket ops” (e.g. `placement`, `terrain`, `features`) that become dumping grounds.
- Prefer verb-forward ops that each do one job: `compute*`, `plan*`, `score*`, `select*` (see ADR-ER1-034).

Healthy slice sizing heuristics:
- Default slice = **one step** (or a small, tightly-coupled cluster of steps that must migrate together due to shared contracts/artifacts/config).
- A slice should be small enough that you can:
  - delete the legacy path(s) used by that slice immediately, and
  - keep reviewability (diff is explainable without a second spike).
- If you catch yourself writing “and also” repeatedly when describing the slice, it’s probably too broad.

Anti-patterns (do not do this):
- “One slice for the whole domain” unless the domain genuinely only has one step/op surface.
- “One op that does everything” where the op id reads like a noun or a domain label rather than an action.
- “We’ll keep the old path until the end” (dual paths = half-migration risk).

## Slice planning artifact (required before coding)

Before writing code, write a short slicing plan in the domain issue doc:
- Slice name (A/B/C… or a short slug)
- Step(s) included (ids + file paths)
- Ops to create/modify (ids + kinds)
- Legacy entrypoints to delete in that slice (file paths / exports)
- Tests to add/update for that slice (op contract test + any thin integration edge)
- Expected guardrail scope (which domains to run via `REFRACTOR_DOMAINS=...`)

## Slice completion checklist (repeat for each slice)

This is the “definition of done” for a slice. You must complete it before moving to the next slice.

<workflow>

<step name="extract-ops-for-slice">

- Create/update the op module(s) needed by this slice under `mods/mod-swooper-maps/src/domain/<domain>/ops/**`.
- Op contracts are POJO/POJO-ish only (typed arrays ok); no adapters/context/RNG callbacks cross the boundary.
- Each op module is contract-first and follows the canonical shape:
  - `contract.ts` via `defineOp`
  - `types.ts` exporting a single `OpTypeBag`
  - `rules/` + `rules/index.ts`
  - `strategies/` + `strategies/index.ts`
  - `index.ts` exporting the created op and re-exporting contract + types
- Op schemas + `defaultConfig` + optional `normalize` are colocated with the op module.

</step>

<step name="wire-steps-for-slice">

- Promote the migrated step(s) into the contract-first step module shape:
  - `contract.ts` (metadata-only via `defineStep`)
  - `index.ts` (orchestration only, created via bound `createStep`)
  - `lib/**` (pure helpers such as `inputs.ts`/`apply.ts`, optional)
- Step contracts declare op contracts via `ops: { <key>: domain.ops.<opKey> }`.
- `defineStep({ ops })` automatically merges each op contract’s `config` schema into the step schema.
- Step modules call injected runtime ops via `run(context, config, ops)` (no local op binding, no importing implementations).

</step>

<step name="delete-legacy-for-slice">

- Delete the legacy entrypoints and helpers that the migrated step(s) used.
- Do not leave compat exports or an “old/new” switch.

</step>

<step name="tests-for-slice">

- Add at least one op contract test for the op(s) introduced/changed in this slice.
- If artifact/config contracts changed across steps, add one thin integration test that exercises the edge.
- Keep tests deterministic (fixed seeds; no RNG callbacks crossing op boundary).

</step>

<step name="documentation-for-slice">

- Treat documentation as part of the slice definition of done.
- For any touched exported symbol (op contracts, step contracts, strategy exports, helper functions used cross-file):
  - Trace callsites/references first (code-intel; do not guess intent).
  - Add/refresh JSDoc on the definition site with behavior-oriented notes (what/why/edge cases).
- For any touched TypeBox schema field (especially config):
  - Ensure it has a meaningful `description` explaining behavioral impact and interactions (not just type).

</step>

<step name="guardrails-for-slice">

Single must-run guardrail gate:
```bash
REFRACTOR_DOMAINS="<domain>[,<domain2>...]" ./scripts/lint/lint-domain-refactor-guardrails.sh
```

If it fails, iterate until clean (no exceptions).

</step>

<step name="commit-slice">

- Commit when the slice is fully complete (no partial commits for a slice).
- Conventional Commits recommended: `refactor(<domain>): <slice summary>`

</step>

</workflow>

## Final slice additions (end-of-domain completion)

In the final slice, do the “around-the-block” cleanup:
- remove now-unused shared helpers that existed only to support legacy paths,
- remove obsolete exports/re-exports that bypass the op boundary,
- update docs/presets/tests that referenced removed legacy structures.

Then run the full verification gates:
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```
