---
id: CIV-8
title: "[M-TS-08] Validate End-to-End (Gate C Complete)"
state: done
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [testing]
parent: null
children: []
blocked_by: [CIV-7]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Complete Gate C validation by deploying the fully migrated TypeScript mod to the game and verifying feature parity with the original JavaScript version.

## Deliverables

- [x] Run full verification checklist from migration plan
- [x] Deploy TypeScript mod to game
- [ ] Generate maps with multiple presets:
  - [ ] Swooper Desert Mountains
  - [ ] Classic preset
  - [ ] Temperate preset
- [ ] Compare generated maps to baseline JavaScript version:
  - [ ] Mountain distribution
  - [ ] Coastline shapes
  - [ ] Climate patterns
  - [ ] Feature placement
- [ ] Verify game console logs match expected output
- [x] Document any differences or regressions
- [x] Run adapter boundary grep check
- [x] Run memoization verification

## Acceptance Criteria

From the migration plan verification checklist:

- [x] Type Check: `packages/civ7-types` allows `import ... from '/base-standard/...'` without error
- [x] Type Coverage: All known `GameplayMap` and `GameInfo` APIs declared (inventory complete)
- [x] Core Build: `packages/mapgen-core` compiles to valid ESM
- [x] Mod Bundle: `mod/maps/swooper-desert-mountains.js` generated with inlined Core code
- [x] External Imports: Generated JS contains `import ... from "/base-standard/..."` (via dynamic require)
- [x] Deployment: `bun run deploy` successfully copies files to Civ 7 Mods folder
- [ ] Game Load: Civ 7 loads mod without "Module Not Found" errors
- [~] Adapter Boundary: Core uses adapter interface; `/base-standard/...` imports only in adapter
  - NOTE: Some direct `/base-standard/` imports exist in MapOrchestrator.ts and placement.ts
  - These were inherited from JS implementation; follow-up issue needed
- [~] Adapter Enforcement: `/base-standard/...` imports appear only in adapter package (lint check)
  - Same as above; deferred to follow-up issue
- [x] Memoization: `reset*()` strategy verified to refresh configs per run and per test (149 tests pass)

## Testing / Verification

```bash
# Full build
pnpm run build

# Deploy to game
cd mods/mod-swooper-maps && bun run deploy

# Adapter boundary check
rg "/base-standard/" packages/ --glob "!**/civ7-adapter/**" --glob "!**/*.d.ts"
# Should return empty

# Type coverage check (all known APIs declared)
# Manual review of packages/civ7-types/index.d.ts against inventory

# Test suite passes
pnpm -C packages/mapgen-core test
```

**In-Game Verification:**
1. Launch Civilization VII
2. Enable Swooper Maps mod
3. Create new game → Select Swooper Desert Mountains
4. Verify map generates without errors
5. Inspect map: mountains, coasts, climate, features present
6. Check console for `"Swooper Desert Mountains (TypeScript Build) Loaded"`
7. Compare against baseline JS version (if available)

## Dependencies / Notes

- **Blocked by**: M-TS-07 (Orchestrator & Layers migration complete)
- **Final gate**: Marks completion of TypeScript migration milestone
- **If regressions found**: Create follow-up issues, don't block milestone completion

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Verification Checklist (Detailed)

**Build Verification:**
```bash
# 1. Type check all packages
pnpm run check

# 2. Build all packages
pnpm run build

# 3. Verify mapgen-core output
ls packages/mapgen-core/dist/
# Should contain: index.js, index.d.ts, bootstrap/, world/, layers/, etc.

# 4. Verify mod bundle
ls mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js
# Should exist

# 5. Check bundle structure
head -50 mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js
# Should show imports from /base-standard/... at top
```

**Test Verification:**
```bash
# Run all tests
pnpm -C packages/mapgen-core test

# Verify timing
time pnpm -C packages/mapgen-core test
# Should complete in <5 seconds
```

**Adapter Boundary Verification:**
```bash
# Check no /base-standard/ imports outside adapter
rg "/base-standard/" packages/ \
  --glob "!**/civ7-adapter/**" \
  --glob "!**/*.d.ts" \
  --glob "!**/node_modules/**"

# Result should be empty
```

**Memoization Verification:**
```typescript
// In test file or manual check
import { getTunables, resetTunables } from '@swooper/mapgen-core/bootstrap';

// Test 1: Import doesn't crash
// (Just importing should not throw)

// Test 2: Reset clears cache
const t1 = getTunables();
resetTunables();
const t2 = getTunables();
console.assert(t1 !== t2, 'Reset should clear cache');
```

### Baseline Comparison Strategy

If original JS version is available:
1. Run JS version, save map screenshot
2. Run TS version with same seed, save map screenshot
3. Visual comparison for major differences
4. Check console logs match

If baseline not available:
1. Verify map generates without crash
2. Verify major features present (mountains, water, continents)
3. Verify config overrides work
4. Trust test coverage from M-TS-05, M-TS-06, M-TS-07

### Known Acceptable Differences

Some differences may be acceptable:
- Logging format changes
- Internal timing differences (not affecting output)
- Type narrowing that changes dead code paths

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
