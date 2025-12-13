---
id: CIV-29
title: "[M2] Remove global config stores"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Technical Debt]
parent: CIV-26
children: []
blocked_by: [CIV-28]
blocked: [CIV-30]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove `globalThis.__EPIC_MAP_CONFIG__` and any other global config stores from the codebase. Update callers to receive config via explicit parameters. This eliminates hidden state and prepares for proper dependency injection.

## Deliverables

- [ ] Remove `globalThis.__EPIC_MAP_CONFIG__` from `bootstrap/runtime.ts`
- [ ] Remove or refactor `setConfig()` / `getConfig()` to use module-scoped state (not globalThis)
- [ ] Update all call sites that read from global config to receive config via parameters
- [ ] Ensure `bootstrap()` function returns validated config instead of storing globally
- [ ] Document the new config flow in code comments

## Acceptance Criteria

- [ ] No `globalThis` config stores in `packages/mapgen-core/src/`
- [ ] `grep -r "globalThis.*CONFIG" packages/mapgen-core/` returns no matches
- [ ] `bootstrap()` returns `MapGenConfig` instead of storing it
- [ ] All consumers receive config via explicit parameters or module imports
- [ ] TypeScript compiles without errors
- [ ] Existing mod scripts continue to work (bootstrap still accepts same options)

## Testing / Verification

```bash
# Search for global config patterns
grep -r "globalThis" packages/mapgen-core/src/ && echo "FAIL: globalThis found" || echo "PASS"
grep -r "__EPIC_MAP_CONFIG__" packages/mapgen-core/src/ && echo "FAIL: global config found" || echo "PASS"

# Type check
pnpm -C packages/mapgen-core check-types

# Build
pnpm -C packages/mapgen-core build

# Unit tests
pnpm -C packages/mapgen-core test
```

## Dependencies / Notes

- **Parent Issue**: CIV-26 (Config Hygiene & Fail-Fast Validation)
- **Blocked by**: CIV-28 (need parseConfig to validate returned config)
- **Blocks**: CIV-30 (orchestrator will receive config from bootstrap)
- **PRD Reference**: `resources/PRD-config-refactor.md` (Phase 1, Requirement 3)

### Why Remove Globals?

Global config stores cause:
- Hidden state that's hard to test
- Race conditions in async scenarios
- Implicit coupling between modules
- Difficulty reasoning about config flow

The new pattern is explicit: `bootstrap()` → validated `MapGenConfig` → pass to consumers.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current State (runtime.ts)

```typescript
// Current pattern (BAD)
let _config: MapConfig = {};

export function setConfig(cfg: MapConfig): void {
  _config = cfg;
  // Some versions also set globalThis.__EPIC_MAP_CONFIG__
}

export function getConfig(): MapConfig {
  return _config;
}
```

### Target State

```typescript
// bootstrap/runtime.ts - Option A: Module-scoped (transitional)
let _validatedConfig: MapGenConfig | null = null;

export function setValidatedConfig(cfg: MapGenConfig): void {
  _validatedConfig = cfg;
}

export function getValidatedConfig(): MapGenConfig {
  if (!_validatedConfig) {
    throw new Error("Config not initialized. Call bootstrap() first.");
  }
  return _validatedConfig;
}

export function resetConfig(): void {
  _validatedConfig = null;
}

// OR Option B: Return from bootstrap (preferred long-term)
// bootstrap/entry.ts
export function bootstrap(options: BootstrapConfig = {}): MapGenConfig {
  const rawConfig = buildRawConfig(options);
  const validatedConfig = parseConfig(rawConfig);

  // Set module-scoped for tunables to read (transitional)
  setValidatedConfig(validatedConfig);

  return validatedConfig;
}
```

### Migration Path

1. **Phase 1 (this issue)**: Remove `globalThis`, keep module-scoped state
   - `getConfig()` / `setConfig()` become `getValidatedConfig()` / `setValidatedConfig()`
   - Tunables continue to read from module-scoped state

2. **Phase 2 (future)**: Full injection
   - `bootstrap()` returns config
   - `MapOrchestrator` constructor accepts config
   - Tunables receive config as parameter

### Files to Modify

- `packages/mapgen-core/src/bootstrap/runtime.ts` — remove globalThis
- `packages/mapgen-core/src/bootstrap/entry.ts` — update bootstrap() signature
- `packages/mapgen-core/src/bootstrap/tunables.ts` — verify reads from module state

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
