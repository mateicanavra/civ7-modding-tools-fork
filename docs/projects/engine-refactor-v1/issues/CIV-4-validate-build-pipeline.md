---
id: CIV-4
title: "[M-TS-04] Validate Build Pipeline (Gate A)"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [architecture, testing]
parent: null
children: []
blocked_by: [CIV-3]
blocked: [CIV-5, CIV-6]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Prove the TypeScript build pipeline works end-to-end by creating a minimal mod entry point that imports a base-standard script, bundles via tsup, deploys to the game, and loads without errors (Gate A validation).

## Deliverables

- [ ] Configure `mods/mod-swooper-maps` for TypeScript:
  - [ ] Add `package.json` with tsup build script
  - [ ] Add `tsconfig.json` extending monorepo base
  - [ ] Add `tsup.config.ts` with `/base-standard/.*` as external
- [ ] Create minimal TypeScript entry point:
  - [ ] `src/swooper-desert-mountains.ts`
  - [ ] Import from `/base-standard/maps/continents.js` (or delegate script)
  - [ ] Add `console.log("Gate A Wrapper Loaded")`
- [ ] Run build: `bun run build` or `pnpm run build`
- [ ] Verify output:
  - [ ] `mod/maps/swooper-desert-mountains.js` exists
  - [ ] Contains `import ... from '/base-standard/...'` preserved
- [ ] Deploy to game: `bun run deploy`
- [ ] Launch game and verify:
  - [ ] Mod loads without "Module Not Found" errors
  - [ ] Map generates successfully (Continents fallback)
  - [ ] Console shows "Gate A Wrapper Loaded"

## Acceptance Criteria

- [ ] `tsup` produces single bundled JS file with externals preserved
- [ ] `@civ7/adapter` and `@swooper/mapgen-core` are force-bundled (inlined, not external)
- [ ] `/base-standard/...` imports appear ONLY as external imports at bundle top (not inlined code)
- [ ] Adapter boundary verified: `/base-standard/` string only appears in import statements, not function bodies
- [ ] No TypeScript compilation errors
- [ ] Game loads mod without errors
- [ ] Game console shows "Gate A Wrapper Loaded"
- [ ] Map generation completes (uses base-standard Continents logic)

## Testing / Verification

```bash
# Build the mod
cd mods/mod-swooper-maps
bun run build

# Check output exists
ls -la mod/maps/swooper-desert-mountains.js

# Verify external imports preserved (should find import statements)
grep "from '/base-standard/" mod/maps/swooper-desert-mountains.js

# Verify adapter boundary: /base-standard/ ONLY in import lines, not in function bodies
# This should return ONLY import/from lines, nothing else
grep -n "/base-standard/" mod/maps/swooper-desert-mountains.js | grep -v "^[0-9]*:import\|^[0-9]*:.*from"
# ^^^ Should return empty (no matches outside imports)

# Verify @civ7/adapter is inlined (NOT an import)
! grep "from '@civ7/adapter'" mod/maps/swooper-desert-mountains.js
# ^^^ Should return empty (adapter is bundled, not imported)

# Deploy to game
bun run deploy

# Then manually launch Civ 7 and:
# 1. Enable the mod
# 2. Start new game with Swooper map
# 3. Check game console for "Gate A Wrapper Loaded"
# 4. Verify map generates without crash
```

## Dependencies / Notes

- **Blocked by**: M-TS-03 (MapGen Core must exist for workspace dependencies)
- **Blocks**: M-TS-05 (Voronoi migration), M-TS-06 (Bootstrap refactor) — we don't migrate heavy logic until pipeline proven
- **Gate A Success Condition**: Game loads and generates a map (even if just Continents fallback)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Mod tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/swooper-desert-mountains.ts'],
  outDir: 'mod/maps',
  format: ['esm'],
  target: 'esnext',
  bundle: true,
  clean: false,  // Don't clear — preserve static XML files
  external: [/^\/base-standard\/.*/],
  noExternal: ['@swooper/mapgen-core', '@civ7/adapter'],  // Force-bundle these
  sourcemap: false,
  minify: false,
});
```

### Minimal Entry Point

```typescript
// src/swooper-desert-mountains.ts
/// <reference types="@civ7/types" />

// Gate A: Prove pipeline works by delegating to base-standard
import '/base-standard/maps/continents.js';

console.log("Gate A Wrapper Loaded - TypeScript Build Pipeline Working");
```

### package.json scripts

```json
{
  "scripts": {
    "build": "tsup",
    "deploy": "bun run build && bun ../../packages/cli/bin/run.js mod manage deploy"
  }
}
```

### Why Continents.js?

Using `continents.js` as delegate ensures:
1. Game generates a valid map (no crash from missing logic)
2. We prove external imports work correctly
3. We can iterate on build config before migrating real logic

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
