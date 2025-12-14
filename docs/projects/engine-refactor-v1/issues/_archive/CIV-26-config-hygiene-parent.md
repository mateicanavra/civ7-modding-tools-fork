---
id: CIV-26
title: "[M2] Implement Config Hygiene & Fail-Fast Validation"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Architecture]
parent: null
children: [CIV-27, CIV-28, CIV-29, CIV-30, CIV-31]
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Establish a single, validated `MapGenConfig` schema with fail-fast behavior, removing global config stores and ensuring the engine receives explicit, type-safe configuration at its boundary. This is a prerequisite for all other M2 work.

## Deliverables

- **`MapGenConfigSchema`**: TypeBox schema defining the canonical configuration shape for the map generation engine.
- **`MapGenConfig` type**: TypeScript type derived from the schema.
- **`parseConfig` helper**: Loader that validates raw config and fails fast on invalid inputs.
- **No global config stores**: Remove `globalThis.__EPIC_MAP_CONFIG__` and similar patterns.
- **Injected config**: `MapOrchestrator` receives validated config via constructor parameter.
- **Tunables as view**: `bootstrap/tunables.ts` builds its snapshot from a `MapGenConfig` instance.

## Acceptance Criteria

- [ ] `MapGenConfigSchema` is defined in `packages/mapgen-core/src/config/schema.ts`
- [ ] `parseConfig(input)` throws on invalid config with clear error messages
- [ ] `safeParseConfig`, `getDefaultConfig`, `getJsonSchema` helpers are exported
- [ ] No global config stores remain in `mapgen-core`
- [ ] `MapOrchestrator` constructor accepts validated config (not raw options)
- [ ] `bootstrap/tunables.ts` consumes `MapGenConfig` instead of loosely-typed globals
- [ ] Existing Swooper Maps mod scripts continue to work without changes
- [ ] TypeScript compiles without errors; `pnpm check-types` passes

## Testing / Verification

```bash
# Build verification
pnpm -C packages/mapgen-core build

# Type check
pnpm -C packages/mapgen-core check-types

# Unit tests for config validation
pnpm -C packages/mapgen-core test

# Integration: verify mod still generates maps
# (manual test in Civ7)
```

## Dependencies / Notes

- **PRD Reference**: `resources/PRD-config-refactor.md` (Phase 1)
- **Milestone**: M2: Stable Shape & Instrumented Engine Slice
- **Blocks**: Foundation pipeline work (LOCAL-TBD-foundation-stage-parent)
- **Adapter boundary scope**: This issue owns config/tunables hygiene only (schema, validation, injection). The adapter boundary cleanup (moving remaining Civ7 map-init behavior off the internal `OrchestratorAdapter` and into `EngineAdapter`, then removing `OrchestratorAdapter`) is explicitly deferred to a later milestone and should be tracked as separate follow-up work.

**Sub-Issues:**
- CIV-27: Define MapGenConfigSchema with TypeBox
- CIV-28: Implement parseConfig loader and helpers
- CIV-29: Remove global config stores
- CIV-30: Wire MapOrchestrator to validated config
- CIV-31: Refactor tunables as view over schema

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Sequencing

This parent issue is broken into 5 sequential sub-issues. Each sub-issue leaves the codebase in a compilable state:

1. **Schema Definition**: Define the TypeBox schema and derive types. No runtime changes yet.
2. **Loader Implementation**: Create the `parseConfig` helper and validation utilities.
3. **Global Removal**: Remove `globalThis` config patterns, update callers to use explicit config.
4. **Orchestrator Wiring**: Update `MapOrchestrator` to accept validated config in constructor.
5. **Tunables Refactor**: Update `tunables.ts` to consume `MapGenConfig` instead of raw config.

### Design Principles

- **Conservative reshaping**: Keep the existing config nesting (e.g., `foundation.plates`) to avoid breaking mod scripts.
- **Fail fast**: Invalid configs throw immediately with clear error messages.
- **No silent coercion**: Don't "fix" invalid values; surface them as errors.
- **Backward compatible**: Existing mod config shapes map into the schema without changes.

### Key Files

- `packages/mapgen-core/src/config/schema.ts` (new)
- `packages/mapgen-core/src/config/loader.ts` (new)
- `packages/mapgen-core/src/config/index.ts` (new)
- `packages/mapgen-core/src/bootstrap/runtime.ts` (modify)
- `packages/mapgen-core/src/bootstrap/tunables.ts` (modify)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify)

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
