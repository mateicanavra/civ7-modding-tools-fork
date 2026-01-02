# Standard Content Config — Agent Router

Scope: `mods/mod-swooper-maps/src/config/**`

- Owns the canonical standard recipe config schema and defaults.
- Keep config shapes centralized here; recipe steps should not invent parallel schemas.
- Changes here affect mod runtime and tooling; run mod + workspace checks after edits.

Docs:
- `docs/system/mods/swooper-maps/architecture.md` (standard content ownership)
- `docs/system/libs/mapgen/design.md`
