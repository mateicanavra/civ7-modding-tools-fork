---
id: CIV-15
title: "[M-TS-P0] Fix Adapter Boundary & Orchestration Wiring"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [bug, architecture]
parent: CIV-14
children: []
blocked_by: []
blocked: [CIV-16, CIV-17]
related_to: [CIV-2]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Replace `MapOrchestrator`'s broken dynamic adapter loading with explicit constructor injection, and add a lint check to prevent future `/base-standard/` boundary violations.

## Problem

`MapOrchestrator.ts:734` attempts:
```typescript
require("./core/adapters.js")  // File doesn't exist in build
```

This fails silently and falls back to `createFallbackAdapter()`, which bypasses the entire `@civ7/adapter` architecture to access `GameplayMap`/`TerrainBuilder` globals directly.

**Result:** The carefully designed adapter package (CIV-2) is never used in production.

## Deliverables

- [ ] Replace dynamic `require()` with explicit adapter strategy:
  - Prefer **constructor injection**: `new MapOrchestrator({ adapter })`
  - Accept adapter factory: `new MapOrchestrator({ createAdapter: (w, h) => new Civ7Adapter(w, h) })`
- [ ] Import `Civ7Adapter` from `@civ7/adapter/civ7` as the default production adapter
- [ ] Remove `createFallbackAdapter()` and globals fallback code
- [ ] Remove direct `/base-standard/` imports from `MapOrchestrator.ts`
  - Move any necessary imports behind `@civ7/adapter`
- [ ] **Add adapter-boundary lint check:**
  - Create `pnpm lint:adapter-boundary` script
  - Fail if `/base-standard/` appears in `packages/**` outside `packages/civ7-adapter/**`
  - Initially allowlist known violations (`placement.ts`) so each branch leaves repo passing
- [ ] Update mod entry point (`swooper-desert-mountains.ts`) to instantiate adapter explicitly

## Acceptance Criteria

- [ ] `MapOrchestrator` accepts adapter via constructor (no dynamic require)
- [ ] `Civ7Adapter` is the default adapter in production
- [ ] No `/base-standard/` imports in `MapOrchestrator.ts`
- [ ] Adapter-boundary lint exists and passes (violations allowlisted)
- [ ] Build passes, existing tests still pass
- [ ] MockAdapter can be injected for testing

## Testing / Verification

```bash
# Adapter boundary check
pnpm lint:adapter-boundary
# Should pass (with allowlisted violations)

# Build verification
pnpm -C packages/mapgen-core build

# Test that MockAdapter can be injected
pnpm -C packages/mapgen-core test --grep "MapOrchestrator"
```

## Dependencies / Notes

- **Blocked by**: Nothing (first in Stack 1)
- **Blocks**: CIV-16 (FoundationContext), CIV-17 (Config resolver)
- **Related to**: CIV-2 (original adapter package creation)

### Files to Modify

- `packages/mapgen-core/src/MapOrchestrator.ts` — main orchestrator
- `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` — entry point
- `package.json` — add lint script
- New: `scripts/lint-adapter-boundary.sh` or similar

### Allowlist Strategy

The lint check should initially allowlist:
- `packages/mapgen-core/src/layers/placement.ts` (deferred to CIV-20)
- Any test files using `/base-standard/` for integration testing

Each subsequent PR should remove items from the allowlist as violations are fixed.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current Code Pattern (Broken)

```typescript
// MapOrchestrator.ts:734 (approximate)
let adapters;
try {
  adapters = require("./core/adapters.js");
} catch {
  adapters = { createFallbackAdapter };
}

// createFallbackAdapter accesses globals directly:
function createFallbackAdapter() {
  return {
    setTerrainType: (x, y, t) => TerrainBuilder.setTerrainType(x, y, t),
    // ... direct global access
  };
}
```

### Target Pattern

```typescript
// MapOrchestrator.ts
import type { EngineAdapter } from "@civ7/adapter";
import { Civ7Adapter } from "@civ7/adapter/civ7";

export interface MapOrchestratorOptions {
  adapter?: EngineAdapter;
  createAdapter?: (width: number, height: number) => EngineAdapter;
}

export class MapOrchestrator {
  private adapter: EngineAdapter;

  constructor(options: MapOrchestratorOptions = {}) {
    if (options.adapter) {
      this.adapter = options.adapter;
    } else if (options.createAdapter) {
      // Defer creation until dimensions known
      this._createAdapter = options.createAdapter;
    } else {
      // Default to Civ7Adapter
      this._createAdapter = (w, h) => new Civ7Adapter(w, h);
    }
  }
}
```

### Entry Point Update

```typescript
// swooper-desert-mountains.ts
import { MapOrchestrator, bootstrap } from "@swooper/mapgen-core";
import { Civ7Adapter } from "@civ7/adapter/civ7";

bootstrap({ preset: "desert-mountains" });

const orchestrator = new MapOrchestrator({
  createAdapter: (w, h) => new Civ7Adapter(w, h)
});

engine.on("GenerateMap", () => orchestrator.generateMap());
```

### Lint Script

```bash
#!/bin/bash
# scripts/lint-adapter-boundary.sh

ALLOWLIST=(
  "packages/mapgen-core/src/layers/placement.ts"
)

violations=$(rg "/base-standard/" packages/ \
  --glob "!**/civ7-adapter/**" \
  --glob "!**/*.d.ts" \
  --glob "!**/node_modules/**" \
  -l)

for file in $violations; do
  allowed=false
  for allowed_file in "${ALLOWLIST[@]}"; do
    if [[ "$file" == *"$allowed_file" ]]; then
      allowed=true
      break
    fi
  done
  if [ "$allowed" = false ]; then
    echo "ERROR: Adapter boundary violation in $file"
    exit 1
  fi
done

echo "Adapter boundary check passed"
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
