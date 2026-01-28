# Verification + Guardrails (Reference)

This is the reference for:
- what tests to add (minimum acceptable coverage),
- what searches/guardrails must go to zero inside scope,
- what verification gates must be green before submission,
- and the “around-the-block” cleanup checklist that prevents dead weight from lingering.

Guardrail script:
- `scripts/lint/lint-domain-refactor-guardrails.sh`

Run it from repo root:
```bash
./scripts/lint/lint-domain-refactor-guardrails.sh
```

Hard rule:
- Always set `REFRACTOR_DOMAINS` to the domain(s) you refactored in this change.
  - Default run profile is boundary-only (fast, pre-commit safe).
  - Use `DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full` only when you explicitly want the stricter checks.

Import guardrails (lint-enforced):
- `rules/**` must not import `../contract.js` (type-only or runtime).
- `rules/**` must not export or re-export types; shared op types live in `types.ts`.
- When using TypeBox in examples/tests, import `Type`/`Static` from `@swooper/mapgen-core/authoring`.

Truth vs map boundary guardrails (lint-enforced):
- Physics ops and Physics step/stage contracts MUST NOT reference or consume `artifact:map.*` / `effect:map.*`.
  - Physics truth MAY be tile-indexed (including `tileIndex`). The ban is on engine/game-facing ids, adapter coupling, and consuming map-layer projections/materialization.
- Gameplay/map steps own projections + materialization:
  - `artifact:map.*` is Gameplay-owned.
  - Adapter writes must provide `effect:map.<thing><Verb>` after the adapter write completes (semantic short verbs; e.g., `effect:map.mountainsPlotted`, `effect:map.elevationBuilt`).

To run guardrails for the domain(s) you touched:
```bash
REFRACTOR_DOMAINS="ecology,foundation" ./scripts/lint/lint-domain-refactor-guardrails.sh
REFRACTOR_DOMAINS="ecology,foundation" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh
```

## Documentation (required)

Documentation is treated as part of the refactor’s correctness surface, not optional polish.

Requirements (within refactor scope):
- Any touched exported op/step/schema must have high-quality, behavior-oriented documentation at the definition site:
  - JSDoc for exported functions/objects where it improves comprehension.
  - TypeBox `description` for schema fields (especially config) describing behavioral impact and interactions.
- For any “semantic knob” (lists/pairs/weights/modes), schema `description` must also state missing/empty/null meaning and determinism expectations where relevant.
- Documentation updates must be contextual:
  - Trace callsites/references first (code-intel) so docs reflect how the symbol is actually used.
  - Avoid duplicating contradictory docs across layers; keep docs consistent between schema descriptions and definition-site docs.
  - Avoid duplicate canonical modeling/spec bodies: one doc is the canonical spike/issue body per phase; supporting docs are linked, not copy/pasted into multiple “equivalent” canon locations.
  - Schema/JSDoc “duplication” is allowed only when context-adapted (audience-specific) rather than a sync-burden copy. If a limitation appears to force duplication, revisit the model instead of encoding drift-prone workarounds.

## Tests (minimum expectations)

Add at least one domain-local unit test for the op contract:
- Validate config selection deterministically using the mod’s canonical helpers:
  - `mods/mod-swooper-maps/test/support/compiler-helpers.ts` (`runOpValidated`, `normalizeStrictOrThrow`)
- Location (mod): `mods/mod-swooper-maps/test/**` (bun test runner via `bun run --cwd mods/mod-swooper-maps test`).
- Recommended minimum assertions:
  - `runOpValidated(op, input, rawSelection)` does schema defaulting + strict validation + `op.normalize(...)`.
  - Validate op output shape explicitly when it matters: `normalizeStrictOrThrow(op.output, output, "<path>")`.

Authoring SDK regression reference (core package):
- `packages/mapgen-core/test/authoring/authoring.test.ts`

Make tests deterministic:
- set `env.seed = 0` (or a fixed seed),
- use a deterministic mock adapter RNG (e.g. `createMockAdapter({ rng: () => 0 })`),
- if the op requires randomness, pass a fixed `rngSeed` input (do not pass RNG callbacks).

If the subissue affects artifact contracts across steps, add one minimal pipeline/integration test for the braid edge:
- Reference pattern: `mods/mod-swooper-maps/test/pipeline/artifacts.test.ts` (registry + provides validation)
- Reference full pipeline gate: `mods/mod-swooper-maps/test/standard-run.test.ts`

## Scorched earth deletion (required inside scope)

After migrating a callsite to ops + step modules:
- remove the old entrypoints for the extracted logic (no “compat exports”),
- remove dead helpers, adapters, translators, and unused exports.
- remove any remaining compat/projection surfaces inside this domain; do not introduce compatibility shims as a refactor technique—migrate and delete in-slice.
- remove placeholders / dead bags: empty directories, placeholder modules, empty config bags/schemas, and any “future scaffolding” that is not actively used in the refactor.
- remove hidden behavior: do not leave unnamed multipliers/thresholds/defaults in compile/normalize/run paths. Any behavior-shaping constant must be either explicit config/knobs or a named internal constant with explicit intent (and reflected in docs/tests where it affects semantics).

Troubleshooting note:
- If the guardrail script fails, use the printed hits (file + line) to drive fixes; run any additional `rg` searches ad-hoc as needed while iterating.

## Verification gates (must be green)

Run smallest-first, then widen:
```bash
REFRACTOR_DOMAINS="<domain>[,<domain2>...]" ./scripts/lint/lint-domain-refactor-guardrails.sh
bun run --cwd packages/mapgen-core check
bun run --cwd packages/mapgen-core test
bun run --cwd mods/mod-swooper-maps check
bun run --cwd mods/mod-swooper-maps test
bun run --cwd mods/mod-swooper-maps build
bun run deploy:mods
bun run check
bun run test
bun run build
```

## “Around-the-block” cleanup checklist (required at the end)

After the domain refactor lands:
- remove now-unused shared helpers that existed only to support legacy paths,
- remove duplicate map entrypoint wiring that is now redundant,
- remove obsolete exports/re-exports that bypass the op boundary,
- remove stale docs references and update any canonical docs that named legacy structures.
- do not leave behind “temporary” deprecated shims; if a shim exists, it is a bug in the slice plan and must be removed by redesigning the slice to migrate and delete.
- confirm there are no placeholder directories/modules or dead config bags/schemas remaining in refactor scope (placeholders/dead bags are not deferrable).
- confirm there are no unnamed behavior-shaping multipliers/thresholds/defaults remaining in compile/normalize/run paths; convert them to config/knobs or named constants with explicit intent.

The domain is not “done” until the surrounding callsites are also cleaned.
