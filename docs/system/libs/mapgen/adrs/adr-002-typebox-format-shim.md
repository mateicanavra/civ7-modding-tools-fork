# ADR-002 — Shim TypeBox Format Registry for Civ7 V8 Compatibility

- **Status:** Accepted
- **Date:** 2025-12-11

## Context

- Civ7’s embedded V8 rejects Unicode property escapes (e.g., `\p{L}`) in regex literals.
- TypeBox’s built-in format registry (`typebox/format`) ships regexes using Unicode properties, notably `idn-email`.
- After switching validation from `typebox/compile` to `typebox/value`, the format registry began loading and its `idn-email` regex caused runtime parse failures inside the bundled mod (see chunk `IdnEmail`).
- MapGenConfig currently does not declare any `format:` keywords, so the built-in format checks are unused.

## Decision

- Provide a local, minimal, regex-free shim for `typebox/format` that implements the public registry surface (`Set`, `Get`, `Has`, `Test`, `Clear`, `Entries`, `Reset`).
- Alias all `typebox/format` imports (and the internal `../format/index.mjs` / `../../format/index.mjs` paths used by TypeBox schema engine) to this shim during bundling in both:
  - `packages/mapgen-core/tsup.config.ts`
  - `mods/mod-swooper-maps/tsup.config.ts`
- Do not register any default formats in the shim; unregistered formats pass by default. Consequence: TypeBox built-in format validation is disabled unless callers explicitly register safe alternatives.

## Consequences

- **Pros:** Civ7 no longer sees Unicode-property regex literals; avoids runtime syntax errors while retaining schema-based validation for types and ranges.
- **Cons:** Built-in TypeBox format checks (e.g., `email`, `uri`, `uuid`, `idn-email`) are no-ops unless we provide safe replacements. If we add `format:` keywords in the future, we must register compatible validators manually.
- **Maintenance:** Keep the tsup alias entries in sync with TypeBox import paths; if TypeBox changes internal paths, adjust the aliases. No node_modules patching is required.

## Implementation Notes

- Shim location: `packages/mapgen-core/src/shims/typebox-format.ts`
  - Commented to note that format validation is disabled by default due to Civ7 V8 limitations.
- tsup aliases:
  - `packages/mapgen-core/tsup.config.ts` aliases `typebox/format`, `../format/index.mjs`, `../../format/index.mjs` to the shim and bundles `typebox`.
  - `mods/mod-swooper-maps/tsup.config.ts` applies the same aliases to ensure the game-facing bundle never pulls the original format registry.
- No changes to the MapGenConfig schema or validation API surface were needed.
