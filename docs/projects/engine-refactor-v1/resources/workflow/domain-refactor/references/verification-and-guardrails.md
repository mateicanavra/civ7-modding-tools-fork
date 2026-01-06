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

To run guardrails for the domain(s) you touched:
```bash
REFRACTOR_DOMAINS="ecology,foundation" ./scripts/lint/lint-domain-refactor-guardrails.sh
```

## Tests (minimum expectations)

Add at least one domain-local unit test for the op contract:
- Use `op.runValidated(input, config, { validateOutput: true })` to catch output-shape drift.
- Location (mod): `mods/mod-swooper-maps/test/**` (bun test runner via `pnpm -C mods/mod-swooper-maps test`).
- Reference pattern for output validation: `packages/mapgen-core/test/authoring/op-validation.test.ts`

Make tests deterministic:
- set `settings.seed = 0` (or a fixed seed),
- use a deterministic mock adapter RNG (e.g. `createMockAdapter({ rng: () => 0 })`),
- if the op requires randomness, pass a fixed `rngSeed` input (do not pass RNG callbacks).

If the subissue affects artifact contracts across steps, add one minimal pipeline/integration test for the braid edge:
- Reference pattern: `mods/mod-swooper-maps/test/pipeline/artifacts.test.ts` (registry + provides validation)
- Reference full pipeline gate: `mods/mod-swooper-maps/test/standard-run.test.ts`

## Scorched earth deletion (required inside scope)

After migrating a callsite to ops + step modules:
- remove the old entrypoints for the extracted logic (no “compat exports”),
- remove dead helpers, adapters, translators, and unused exports.

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

The domain is not “done” until the surrounding callsites are also cleaned.
