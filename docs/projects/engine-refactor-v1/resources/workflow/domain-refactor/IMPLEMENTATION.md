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

Keep open while implementing:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-reference.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

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

## Drift response protocol (required if you notice drift)

If you detect drift or a locked decision is violated, pause and:
1. Write a short status report (what changed, what is in-flight, what is next).
2. Update the Phase 3 issue to insert the locked decision as a gate.
3. Replace “later” buckets with explicit subissues and branches.
4. Add guardrails (string/surface checks or contract-guard tests) to prevent reintroduction.

## Slice planning artifact (required before coding)

Before writing code, write a short slicing plan in the domain issue doc:
- Slice name (A/B/C… or a short slug)
- Step(s) included (ids + file paths)
- Ops to create/modify (ids + kinds)
- Legacy entrypoints to delete in that slice (file paths / exports)
- Tests to add/update for that slice (op contract test + any thin integration edge)
- Expected guardrail scope (which domains to run via `REFRACTOR_DOMAINS=...`)
- Locked decisions + bans (and how each becomes a guardrail)
- Step decomposition plan (causality spine → step boundaries → artifacts/buffers)
- Consumer inventory + migration matrix (break/fix by slice)

## Slice completion checklist (repeat for each slice)

This is the “definition of done” for a slice. You must complete it before moving to the next slice.

### 1) Extract ops for the slice

- Create/update the op module(s) needed by this slice under `mods/mod-swooper-maps/src/domain/<domain>/ops/**`.
- Op contracts are POJO/POJO-ish only (typed arrays ok); no adapters/context/RNG callbacks cross the boundary.
- Run handlers assume normalized config (no hidden defaults or fallback values).
- If you touch a “semantic knob” (lists/pairs/weights/modes), ensure its meaning + missing/empty/null + determinism expectations are explicitly documented (Phase 2 semantics table) and enforced by tests; do not infer semantics ad hoc in `run(...)`.
- Each op module is contract-first and follows the canonical shape:
  - `contract.ts` via `defineOp`
  - `types.ts` exporting a single `OpTypeBag`
  - `rules/` + `rules/index.ts`
  - `strategies/` + `strategies/index.ts`
  - `index.ts` exporting the created op and re-exporting contract + types
- Op schemas + `defaultConfig` + optional `normalize` are colocated with the op module.

### 2) Wire steps for the slice

- Promote the migrated step(s) into the contract-first step module shape:
  - `contract.ts` (metadata-only via `defineStep`)
  - `index.ts` (orchestration only, created via bound `createStep`)
  - `lib/**` (pure helpers such as `inputs.ts`/`apply.ts`, optional)
- Step contracts declare op contracts via `ops: { <key>: domain.ops.<opKey> }`.
- `defineStep({ ops })` automatically merges each op contract’s `config` schema into the step schema.
- Step modules call injected runtime ops via `run(context, config, ops)` (no local op binding, no importing implementations).

### 3) Delete legacy for the slice

- Delete the legacy entrypoints and helpers that the migrated step(s) used.
- Do not leave compat exports or an “old/new” switch.
- Remove any compat/projection surfaces from this domain. If downstream needs transitional compatibility, implement it downstream with explicit `DEPRECATED` / `DEPRECATE ME` markers.
- No dual-path compute: if old and new both produce the same concept, delete the old path in this slice unless an explicit deferral trigger is recorded.

### 4) Tests for the slice

- Add at least one op contract test for the op(s) introduced/changed in this slice.
- If artifact/config contracts changed across steps, add one thin integration test that exercises the edge.
- Keep tests deterministic (fixed seeds; no RNG callbacks crossing op boundary).
- If the slice introduces or changes probabilistic behavior (weights), add a deterministic test that would fail if RNG/seed semantics drift.

### 5) Documentation for the slice (required)

- Treat documentation as part of the slice definition of done.
- For any touched exported symbol (op contracts, step contracts, strategy exports, helper functions used cross-file):
  - Trace callsites/references first (code-intel; do not guess intent).
  - Add/refresh JSDoc on the definition site with behavior-oriented notes (what/why/edge cases).
- For any touched TypeBox schema field (especially config):
  - Ensure it has a meaningful `description` explaining behavioral impact and interactions (not just type).

#### Knobs + defaults: durable good/bad practices (with examples)

These are the highest-frequency failure modes when refactoring domains that have:
- **knobs** (semantic author intent), and
- **advanced config** (explicit numeric/structural overrides).

The intent is to keep the pipeline deterministic, keep the “advanced overrides win” contract enforceable, and avoid
hidden defaults that silently change behavior.

##### ✅ Good: decide precedence at a stable boundary (stage compile), using *presence*, not value equality

If advanced config overrides knobs, you must be able to distinguish:
- “missing / undefined” (author did not specify) vs.
- “explicitly provided” (author specified, even if equal to the default).

Do this at the **stage compile boundary**, where you still have access to the author’s raw inputs.

```ts
// GOOD: presence-based override (no compare-to-default sentinels)
const advanced = publicConfig.computePrecipitation ?? {};
const hasRainfallScale = Object.prototype.hasOwnProperty.call(advanced, "rainfallScale");

const internal = { ...defaultInternalConfig }; // defaulted by schema/defaultConfig
internal.computePrecipitation.rainfallScale = hasRainfallScale
  ? advanced.rainfallScale
  : rainfallScaleFromKnobs(knobs);
```

##### ❌ Bad: “compare-to-default” gating (a.k.a. deep-merge-by-hand)

Avoid patterns that only apply knob logic “if the config still equals a particular default number”.
This hides behavior and fails when an author explicitly sets a value equal to the default.

```ts
// BAD: compare-to-default sentinel gating (breaks "advanced overrides win")
if (cfg.computeThermalState.config.baseTemperatureC === 14) {
  cfg.computeThermalState.config.baseTemperatureC = baseTempFromKnobs(knobs);
}
```

##### ✅ Good: rely on schema defaulting; normalize should not re-parse and re-default

In this codebase, step schemas are validated and defaulted before `step.normalize(...)` runs.
`step.normalize` should therefore be reserved for **pure derived values** (if any), not:
- interpreting unknown/invalid knob values,
- “helpfully” defaulting missing fields,
- adding fallback semantics after validation.

```ts
// GOOD: normalize assumes validated/defaulted shape; only derives a value.
normalize: (cfg) => ({ ...cfg, derived: derive(cfg) })
```

```ts
// BAD: normalize re-parses knobs and silently defaults (drift-prone and undocumented).
normalize: (_cfg, ctx) => ({ ..._cfg, foo: isRecord(ctx.knobs) ? ctx.knobs.foo ?? "x" : "x" })
```

##### ✅ Good: multipliers and mappings are named, documented constants (or explicit inputs)

If a knob implies numeric scaling, do not bury multipliers as “magic numbers” deep in normalization logic.
Choose one of:
- **Internal constant** (if it must not be tuned): name it and document the rationale.
- **Explicit input** (if it is a tuning degree of freedom): surface it as advanced config or an intensity knob.

```ts
// GOOD: named constant, documented once, reused everywhere
export const DRYNESS_RAINFALL_SCALE = { wet: 1.15, mix: 1.0, dry: 0.85 } as const;
```

```ts
// BAD: magic numbers scattered throughout step.normalize/run
const drynessScale = dryness === "wet" ? 1.15 : dryness === "dry" ? 0.85 : 1.0;
```

##### ✅ Good: schema reuse only for *meaningfully identical* knobs; otherwise define stage-local knobs

If a knob has the same meaning across stages, define a single canonical leaf schema and reuse it.
If the meaning differs by stage, define **stage-local** knobs with stage-local docs (do not share a name).

Also: if your project requires “redundant” docs, do it deliberately:
- keep shared leaf schemas for type/validation,
- re-declare stage knob objects so each **property** can have stage-scoped JSDoc + `description`.

```ts
// GOOD: shared leaf schema + stage-local object docs
const DrynessSchema = Type.Union([...], { description: "...", default: "mix" });
export const ClimateBaselineKnobsSchema = Type.Object(
  {
    /** Used to scale baseline rainfall only (does not affect hydrography thresholds). */
    dryness: Type.Optional(DrynessSchema),
  },
  { description: "Knobs for climate baseline only." }
);
```

```ts
// BAD: reusing schema.properties is convenient, but blocks stage-scoped per-property JSDoc.
export const ClimateBaselineKnobsSchema = Type.Object({
  dryness: HydrologyKnobsSchema.properties.dryness,
});
```

### 6) Guardrails for the slice

Single must-run guardrail gate:
```bash
REFRACTOR_DOMAINS="<domain>[,<domain2>...]" ./scripts/lint/lint-domain-refactor-guardrails.sh
```

If it fails, iterate until clean (no exceptions).

If a locked decision/banned surface was introduced in this slice, add a guardrail (test/scan) in the same slice.

### 6.5) Survivability validation (required for fixes and review-driven changes)

Before committing the slice, confirm:
- The fix is anchored at a stable interface (domain boundary / config normalization) rather than an implementation detail likely to be replaced in a later slice.
- Any non-trivial config semantics touched are locked by tests (not just prose).

### 7) Commit the slice (Graphite-only)

- Commit when the slice is fully complete (no partial commits for a slice).
```bash
gt add -A
gt modify --commit -am "refactor(<domain>): <slice summary>"
```

## Final slice additions (end-of-domain completion)

In the final slice, do the “around-the-block” cleanup:
- remove now-unused shared helpers that existed only to support legacy paths,
- remove obsolete exports/re-exports that bypass the op boundary,
- update docs/presets/tests that referenced removed legacy structures.
- if any downstream deprecated shims were added, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`, or open a dedicated downstream issue if the next domain can remove them safely (link the issue from triage).

Before the full repo gates, run the fast refactor gates:
```bash
REFRACTOR_DOMAINS="<domain>" ./scripts/lint/lint-domain-refactor-guardrails.sh
pnpm check
```

Then run the full verification gates:
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

Finally, do the Phase 5 traceability pass:
- Update the Phase 3 issue doc Lookback 4 (what changed vs plan, and why).
- Record true deferrals with explicit triggers in `docs/projects/engine-refactor-v1/deferrals.md` (do not “defer” planned work casually).
