---
id: CIV-31
title: "[M2] Refactor tunables as view over MapGenConfig"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Technical Debt]
parent: CIV-26
children: []
blocked_by: [CIV-30]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Refactor `bootstrap/tunables.ts` so that `buildTunablesSnapshot()` operates on a validated `MapGenConfig` instance rather than loosely-typed config and globals. The public tunables surface (`FOUNDATION_CFG`, `CLIMATE_CFG`, etc.) remains unchanged to avoid breaking downstream layers.

## Deliverables

- [ ] Update `buildTunablesSnapshot()` to accept `MapGenConfig` parameter
- [ ] Remove internal calls to `getConfig()` — receive config explicitly
- [ ] Move defaults from tunables into the TypeBox schema where possible
- [ ] Keep public `TUNABLES` object and `getTunables()` API unchanged
- [ ] Add `buildTunablesFromConfig(config: MapGenConfig): TunablesSnapshot` helper
- [ ] Document which defaults are now in schema vs tunables

## Acceptance Criteria

- [ ] `buildTunablesSnapshot(config: MapGenConfig)` signature updated
- [ ] No `getConfig()` calls in `tunables.ts`
- [ ] `getTunables()` continues to work (reads from module state for backward compat)
- [ ] Public tunables surface unchanged:
  - `TUNABLES.STAGE_MANIFEST`
  - `TUNABLES.FOUNDATION_CFG`
  - `TUNABLES.FOUNDATION_PLATES`
  - `TUNABLES.CLIMATE_CFG`
  - etc.
- [ ] TypeScript compiles without errors
- [ ] Existing layers continue to work without modification

## Testing / Verification

```bash
# Type check
pnpm -C packages/mapgen-core check-types

# Build
pnpm -C packages/mapgen-core build

# Verify no getConfig calls in tunables
grep -n "getConfig" packages/mapgen-core/src/bootstrap/tunables.ts && echo "WARN: getConfig still used" || echo "PASS"

# Unit tests
pnpm -C packages/mapgen-core test

# Integration: verify tunables work in full generation
# (manual test in Civ7)
```

## Dependencies / Notes

- **Parent Issue**: CIV-26 (Config Hygiene & Fail-Fast Validation)
- **Blocked by**: CIV-30 (tunables may receive config from orchestrator)
- **PRD Reference**: `resources/PRD-config-refactor.md` (Phase 1, Requirement 4)

### Why Keep Tunables?

Tunables serve as a compatibility layer for existing layers:
- Layers read `TUNABLES.FOUNDATION_CFG`, `TUNABLES.CLIMATE_CFG`, etc.
- Changing every layer to read from `context.config` is out of scope for Phase 1
- Phase 3 will retire tunables when layers are refactored

This issue makes tunables *consume* validated config without changing their *output* shape.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current State (tunables.ts)

```typescript
function buildTunablesSnapshot(): TunablesSnapshot {
  const config = getConfig(); // BAD: reads from global state
  // ... build snapshot from loosely-typed config
}

export function getTunables(): TunablesSnapshot {
  if (_cache) return _cache;
  _cache = buildTunablesSnapshot();
  return _cache;
}
```

### Target State

```typescript
import type { MapGenConfig } from "../config/index.js";

/**
 * Build tunables snapshot from validated config.
 * This is the primary interface for constructing tunables.
 */
export function buildTunablesFromConfig(config: MapGenConfig): TunablesSnapshot {
  // All logic moves here, operating on validated config
  const togglesConfig = config.toggles ?? {};
  const foundationConfig = config.foundation ?? {};
  // ... rest of snapshot building

  return {
    STAGE_MANIFEST: buildStageManifest(config),
    STORY_ENABLE_HOTSPOTS: togglesConfig.STORY_ENABLE_HOTSPOTS ?? true,
    // ... etc
  };
}

// Module state for backward compat
let _cache: TunablesSnapshot | null = null;
let _boundConfig: MapGenConfig | null = null;

/**
 * Bind tunables to a config. Call this from bootstrap/orchestrator.
 */
export function bindTunables(config: MapGenConfig): void {
  _boundConfig = config;
  _cache = null; // Invalidate cache
}

/**
 * Get tunables (builds from bound config if not cached).
 */
export function getTunables(): TunablesSnapshot {
  if (_cache) return _cache;
  if (!_boundConfig) {
    throw new Error("Tunables not bound. Call bindTunables(config) first.");
  }
  _cache = buildTunablesFromConfig(_boundConfig);
  return _cache;
}

/**
 * Reset tunables state (for tests).
 */
export function resetTunables(): void {
  _cache = null;
  _boundConfig = null;
}
```

### Default Migration

Some defaults currently live in tunables:

```typescript
// Current (in tunables.ts)
const DEFAULT_PLATES = {
  count: 8,
  relaxationSteps: 5,
  // ...
};
```

Move these to TypeBox schema:

```typescript
// In schema.ts
const FoundationPlatesSchema = Type.Object({
  count: Type.Optional(Type.Number({ default: 8, minimum: 2, maximum: 20 })),
  relaxationSteps: Type.Optional(Type.Number({ default: 5 })),
  // ...
});
```

Then tunables just reads from validated config (defaults already applied by `parseConfig`).

### Integration with Bootstrap

```typescript
// bootstrap/entry.ts
export function bootstrap(options: BootstrapConfig = {}): MapGenConfig {
  const rawConfig = buildRawConfig(options);
  const validatedConfig = parseConfig(rawConfig);

  // Bind tunables for backward compat
  bindTunables(validatedConfig);

  return validatedConfig;
}
```

### Files to Modify

- `packages/mapgen-core/src/bootstrap/tunables.ts` — main refactor
- `packages/mapgen-core/src/bootstrap/entry.ts` — add bindTunables call
- `packages/mapgen-core/src/config/schema.ts` — add defaults from tunables

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
