---
id: CIV-30
title: "[M2] Wire MapOrchestrator to validated config"
state: in-progress
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Architecture]
parent: CIV-26
children: []
blocked_by: [CIV-29]
blocked: [CIV-31]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Update `MapOrchestrator` to receive validated `MapGenConfig` via constructor injection rather than reading from global state. The orchestrator should fail fast if config is invalid or missing, eliminating silent failures.

## Deliverables

- [x] Update `MapOrchestrator` constructor to accept `MapGenConfig` as parameter
- [x] Remove internal calls to `getConfig()` or global config lookups
- [x] Store validated config as instance property (`this.mapGenConfig`)
- [x] Add fail-fast check: throw if config is not provided or invalid
- [x] Update callers (mod entry points) to pass config from `bootstrap()`
- [x] Ensure config is accessible to downstream stages via orchestrator (`getMapGenConfig()`)

## Acceptance Criteria

- [x] `MapOrchestrator` constructor signature: `constructor(config: MapGenConfig, options?: OrchestratorConfig)`
- [x] Constructing without config throws: `new MapOrchestrator(undefined as any, {})` → Error
- [x] `this.mapGenConfig` is available throughout orchestration lifecycle
- [x] No `getConfig()` calls remain in `MapOrchestrator.ts`
- [x] Mod entry points updated to: `const config = bootstrap(opts); new MapOrchestrator(config, options)`
- [x] TypeScript compiles without errors
- [x] Existing map generation continues to work (deploy succeeds)

## Testing / Verification

```bash
# Type check
pnpm -C packages/mapgen-core check-types

# Build
pnpm -C packages/mapgen-core build

# Verify no getConfig calls in orchestrator
grep -n "getConfig" packages/mapgen-core/src/MapOrchestrator.ts && echo "WARN: getConfig still used" || echo "PASS"

# Unit tests
pnpm -C packages/mapgen-core test
```

## Dependencies / Notes

- **Parent Issue**: CIV-26 (Config Hygiene & Fail-Fast Validation)
- **Blocked by**: CIV-29 (need clean config flow before wiring)
- **Blocks**: CIV-31 (tunables may read from orchestrator.config)
- **PRD Reference**: `resources/PRD-config-refactor.md` (Phase 1, Section 6.4)

### Constructor Injection Benefits

- Explicit dependencies (no hidden global reads)
- Testable (pass mock config in tests)
- Fail fast (missing config throws immediately)
- Clear ownership (orchestrator owns config for its lifetime)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current State (MapOrchestrator.ts)

```typescript
export class MapOrchestrator {
  private adapter: EngineAdapter;

  constructor(adapter: EngineAdapter) {
    this.adapter = adapter;
    // Config read from global state via getTunables() or getConfig()
  }

  generateMap(): void {
    rebind(); // Refresh tunables from global config
    const tunables = getTunables();
    // ... use tunables
  }
}
```

### Target State

```typescript
import type { MapGenConfig } from "./config/index.js";

export class MapOrchestrator {
  private readonly config: MapGenConfig;
  private readonly adapter: EngineAdapter;

  constructor(config: MapGenConfig, adapter: EngineAdapter) {
    if (!config) {
      throw new Error("MapOrchestrator requires validated MapGenConfig");
    }
    this.config = config;
    this.adapter = adapter;
  }

  generateMap(): void {
    // Use this.config directly or pass to tunables
    const tunables = buildTunablesFromConfig(this.config);
    // ... use tunables
  }

  // Expose config for downstream access if needed
  getConfig(): MapGenConfig {
    return this.config;
  }
}
```

### Mod Entry Point Update

```typescript
// mods/mod-swooper-maps/src/gate-a-continents.ts
import { bootstrap, MapOrchestrator } from "@swooper/mapgen-core";
import { Civ7Adapter } from "@civ7/adapter";

export function generateMap(): void {
  // Bootstrap returns validated config
  const config = bootstrap({
    presets: ["classic"],
    overrides: { foundation: { plates: { count: 10 } } }
  });

  // Pass config to orchestrator
  const adapter = new Civ7Adapter();
  const orchestrator = new MapOrchestrator(config, adapter);
  orchestrator.generateMap();
}
```

### Transitional Pattern

If full refactor is too invasive, use a transitional pattern:

```typescript
export class MapOrchestrator {
  private config: MapGenConfig;
  private adapter: EngineAdapter;

  constructor(configOrAdapter: MapGenConfig | EngineAdapter, adapter?: EngineAdapter) {
    // Support both old and new signatures temporarily
    if (adapter) {
      // New: MapOrchestrator(config, adapter)
      this.config = configOrAdapter as MapGenConfig;
      this.adapter = adapter;
    } else {
      // Old: MapOrchestrator(adapter) — deprecated
      console.warn("MapOrchestrator(adapter) is deprecated. Pass config first.");
      this.adapter = configOrAdapter as EngineAdapter;
      this.config = getValidatedConfig(); // Fall back to module state
    }
  }
}
```

### Files to Modify

- `packages/mapgen-core/src/MapOrchestrator.ts` — update constructor
- `mods/mod-swooper-maps/src/gate-a-continents.ts` — update entry point
- `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` — update entry point
- Any other mod entry points

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
