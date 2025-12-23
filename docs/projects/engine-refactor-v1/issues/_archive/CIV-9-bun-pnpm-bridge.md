---
id: CIV-9
title: "[M-TS-09] Configure Bun/pnpm Bridge Scripts (Gate D Contingency)"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [architecture, technical-debt]
parent: null
children: []
blocked_by: [CIV-3]
blocked: []
related_to: [CIV-5, CIV-6]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Create bridge scripts for Bun ↔ pnpm interop and document the fallback path if Bun introduces instability, ensuring the migration can proceed regardless of toolchain friction.

> **Note:** This was originally a Gate D contingency under the M1 migration. The core TS engine is now stable, so this bridge is tracked as an optional tooling improvement under M4 and is not required for the main engine refactor milestones.

## Deliverables

- [ ] Create bridge scripts at repo root:
  - [ ] `scripts/bun-test.sh` — wrapper for running Bun tests from pnpm context
  - [ ] `scripts/bun-build.sh` — wrapper for running Bun builds
- [ ] Add pnpm scripts that delegate to Bun:
  - [ ] `"test:mapgen": "pnpm -C packages/mapgen-core exec bun test"`
  - [ ] `"build:mapgen": "pnpm -C packages/mapgen-core exec bun run build"`
- [ ] Document fallback procedure in milestone notes:
  - [ ] Criteria for triggering fallback (3+ blocking issues with Bun)
  - [ ] Steps to migrate from Bun to pnpm/vitest/tsup
  - [ ] Expected effort for fallback (~1 day)
- [ ] Create fallback `vitest.config.ts` template (not wired, just ready)
- [ ] Verify bridge scripts work in CI-like environment (no global Bun required)

## Acceptance Criteria

- [ ] `pnpm run test:mapgen` successfully runs Bun tests from repo root
- [ ] `pnpm run build:mapgen` successfully builds mapgen-core via Bun
- [ ] Bridge scripts work without global Bun install (use `pnpm exec bun`)
- [ ] Fallback procedure documented with clear trigger criteria
- [ ] vitest.config.ts template present and validated (dry run works)

## Testing / Verification

```bash
# Test bridge from root
pnpm run test:mapgen

# Verify no global Bun dependency
which bun && echo "Global Bun found" || echo "No global Bun"
pnpm -C packages/mapgen-core exec bun --version

# Dry-run fallback vitest config
pnpm -C packages/mapgen-core exec vitest --config vitest.fallback.config.ts --dry-run
```

## Dependencies / Notes

- **Blocked by**: M-TS-03 (MapGen Core must exist)
- **Related to**: M-TS-05 (Voronoi tests), M-TS-06 (Bootstrap tests)
- **Gate D Trigger Criteria**: Switch to fallback if:
  1. Bun causes 3+ blocking issues during Gate B/C
  2. CI fails due to Bun version incompatibilities
  3. pnpm workspace resolution conflicts with Bun imports

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Bridge Script Example

```bash
#!/bin/bash
# scripts/bun-test.sh
set -e
cd "$(dirname "$0")/../packages/mapgen-core"
pnpm exec bun test "$@"
```

### Fallback vitest.config.ts Template

```typescript
// packages/mapgen-core/vitest.fallback.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
```

### Fallback Migration Steps

1. Rename `bunfig.toml` → `bunfig.toml.bak`
2. Rename `vitest.fallback.config.ts` → `vitest.config.ts`
3. Update `package.json` scripts: `"test": "vitest run"`
4. Update test imports: `bun:test` → `vitest`
5. Run `pnpm install` to ensure vitest deps
6. Verify: `pnpm -C packages/mapgen-core test`

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
