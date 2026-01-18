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

Import guardrails (lint-enforced):
- `rules/**` must not import `../contract.js` (type-only or runtime).
- `rules/**` must not export or re-export types; shared op types live in `types.ts`.
- When using TypeBox in examples/tests, import `Type`/`Static` from `@swooper/mapgen-core/authoring`.

To run guardrails for the domain(s) you touched:
```bash
REFRACTOR_DOMAINS="ecology,foundation" ./scripts/lint/lint-domain-refactor-guardrails.sh
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
- Location (mod): `mods/mod-swooper-maps/test/**` (bun test runner via `pnpm -C mods/mod-swooper-maps test`).
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
- remove any remaining compat/projection surfaces inside this domain; if downstream needs transitional compatibility, it must be implemented downstream and explicitly marked as deprecated.

Troubleshooting note:
- If the guardrail script fails, use the printed hits (file + line) to drive fixes; run any additional `rg` searches ad-hoc as needed while iterating.

## Verification gates (must be green)

Run smallest-first, then widen:
```bash
REFRACTOR_DOMAINS="<domain>[,<domain2>...]" ./scripts/lint/lint-domain-refactor-guardrails.sh
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
pnpm check
pnpm test
pnpm build
```

## “Around-the-block” cleanup checklist (required at the end)

After the domain refactor lands:
- remove now-unused shared helpers that existed only to support legacy paths,
- remove duplicate map entrypoint wiring that is now redundant,
- remove obsolete exports/re-exports that bypass the op boundary,
- remove stale docs references and update any canonical docs that named legacy structures.
- if any downstream deprecated shims were added, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`, or open a dedicated downstream issue if the next domain can remove them safely (link the issue from triage).

The domain is not “done” until the surrounding callsites are also cleaned.
