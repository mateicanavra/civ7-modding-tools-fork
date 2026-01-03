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

Note:
- Unless `REFRACTOR_DOMAINS` is set, the script currently checks: `ecology`, `foundation`, `morphology`, `narrative`, `hydrology`, `placement`.

To restrict to a subset of domains:
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

## Guardrail searches (must go to zero in the touched scope)

Run these after each subissue and at the end; for every remaining hit, either delete the code path or move it back to the correct boundary.

These commands assume you’ve set `DOMAIN_ROOT` and `STAGE_ROOTS` from:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`

Domain must not depend on adapter/runtime:
```bash
rg -n "ExtendedMapContext|context\\.adapter|\\badapter\\b|@civ7/adapter" "${DOMAIN_ROOT}" -S
```

Domain must not import engine/runtime values (type-only imports of `RunSettings` are allowed; runtime imports are forbidden):
```bash
rg -n "from \"@swooper/mapgen-core/engine\"|from \"@mapgen/engine\"" "${DOMAIN_ROOT}" -S
rg -n -P "import(?!\\s+type)\\s+.*from\\s+\"@swooper/mapgen-core/engine\"" "${DOMAIN_ROOT}" -S
rg -n -P "import(?!\\s+type)\\s+.*from\\s+\"@mapgen/engine\"" "${DOMAIN_ROOT}" -S
```

Domain ops must not accept RNG callbacks/state (randomness must be modeled as numeric seeds in op inputs):
```bash
rg -n "RngFunction|options\\.rng|\\bctx\\.rng\\b" "${DOMAIN_ROOT}" -S
```

Refactored steps must not import legacy domain entrypoints or centralized config blobs:
```bash
rg -n "@mapgen/config\\b" "${STAGE_ROOTS[@]}" -S
rg -n "@mapgen/domain/${DOMAIN}/" "${STAGE_ROOTS[@]}" -S
```

Runtime config defaulting/merging must not exist in step/op `run(...)` paths:
```bash
rg -n "\\?\\?\\s*\\{\\}" "${DOMAIN_ROOT}" "${STAGE_ROOTS[@]}" -S
rg -n "\\bValue\\.Default\\(" "${DOMAIN_ROOT}" "${STAGE_ROOTS[@]}" -S
```

Refactored steps must not cast config to recover type safety (remove `as SomeConfig` and use schema-derived types):
```bash
rg -n "\\bas\\s+[A-Za-z0-9_]+Config\\b" "${STAGE_ROOTS[@]}" -S
```

## Verification gates (must be green)

Run smallest-first, then widen:
```bash
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
