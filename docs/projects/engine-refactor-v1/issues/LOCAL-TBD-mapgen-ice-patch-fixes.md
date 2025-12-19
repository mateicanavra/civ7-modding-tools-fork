---
id: LOCAL-TBD
title: "Fix Mapgen-Core Navigation Ice Patches"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Documentation, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-46]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Address three high-entropy "ice patches" in mapgen-core where agents (and new engineers) slip due to multiple locally-plausible paths with no clear disambiguator.

## Deliverables

- [ ] Create `packages/mapgen-core/src/pipeline/AGENTS.md` with canonical step registration flow.
- [ ] Extend `packages/mapgen-core/src/config/AGENTS.md` with default value convention.
- [ ] Create `packages/mapgen-core/src/pipeline/narrative/steps.ts` barrel file (normalize with other layers).
- [ ] Update `packages/mapgen-core/src/pipeline/narrative/index.ts` to import from `./steps.js`.

## Acceptance Criteria

- [ ] `src/pipeline/AGENTS.md` documents the 5-file step registration flow and explicitly states invariants.
- [ ] `src/config/AGENTS.md` documents the default value cascade (schema → preset → override) and prohibits function-level defaults.
- [ ] All pipeline layers now follow the same pattern: `{phase}/steps.ts` → `{phase}/index.ts`.
- [ ] An agent reading these files can unambiguously answer: "Where do I add a new step?" and "Where does this default go?"
- [ ] `pnpm -F @swooper/mapgen-core check` passes.
- [ ] `pnpm -F @swooper/mapgen-core test` passes.

## Testing / Verification

- `pnpm -F @swooper/mapgen-core check`
- `pnpm -F @swooper/mapgen-core test`
- Manual review: read the new AGENTS.md content and verify it answers navigation questions without ambiguity.

## Dependencies / Notes

- **Context:** Ice patch analysis identified three high-entropy areas where multiple plausible paths exist with no documented disambiguator.
- **Related:** CIV-46 (Config Evolution) — the config convention doc supports that work.
- **Scope guardrail:** Documentation + one structural normalization only; do not refactor registration code or config defaults themselves.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Ice Patch Summary

| Ice Patch | Risk | Fix |
|-----------|------|-----|
| STEP_REGISTRATION_ENTROPY | HIGH | Add `pipeline/AGENTS.md` with registration flow |
| CONFIG_DEFAULT_TRINITY | HIGH | Extend `config/AGENTS.md` with default convention |
| NARRATIVE_STEPS_ANOMALY | MEDIUM | Create `narrative/steps.ts` barrel |

### Fix 1: Pipeline AGENTS.md

Create `packages/mapgen-core/src/pipeline/AGENTS.md`:

```markdown
# Pipeline Steps — Agent Router

Scope: `packages/mapgen-core/src/pipeline/**`

## Canonical Step Registration Flow

1. **Step file:** `pipeline/{phase}/{Name}Step.ts` — implements `MapGenStep`
2. **Barrel:** `pipeline/{phase}/steps.ts` — re-exports `createXxxStep()`
3. **Layer register:** `pipeline/{phase}/index.ts` — calls `registry.register()`
4. **Library:** `pipeline/standard-library.ts` — calls `register{Phase}Layer()`
5. **Stage order:** `bootstrap/resolved.ts:STAGE_ORDER` + `pipeline/standard.ts:M3_STAGE_DEPENDENCY_SPINE`

**DO NOT** register steps directly in mod code or tests unless explicitly testing custom steps.

## Adding a New Step

1. Create `pipeline/{phase}/MyNewStep.ts` implementing `MapGenStep`
2. Export `createMyNewStep()` from `pipeline/{phase}/steps.ts`
3. Add registration call in `pipeline/{phase}/index.ts`
4. Add stage name to `bootstrap/resolved.ts:STAGE_ORDER`
5. Add dependency spine to `pipeline/standard.ts:M3_STAGE_DEPENDENCY_SPINE`

## Quick Reference

Entrypoints:
- Step implementation: `src/pipeline/{phase}/{Name}Step.ts`
- Barrel export: `src/pipeline/{phase}/steps.ts`
- Layer registration: `src/pipeline/{phase}/index.ts`
- Stage order: `src/bootstrap/resolved.ts:STAGE_ORDER`
- Dependencies: `src/pipeline/standard.ts:M3_STAGE_DEPENDENCY_SPINE`

Commands:
- Type check: `pnpm -F @swooper/mapgen-core check`
- Test: `pnpm -F @swooper/mapgen-core test`

Invariants:
- All phases MUST have a `steps.ts` barrel file
- Step order is defined in `STAGE_ORDER`, not step files
- Steps MUST NOT contain business logic — call `domain/` functions
```

### Fix 2: Config AGENTS.md Extension

Add to `packages/mapgen-core/src/config/AGENTS.md`:

```markdown
## Default Value Convention (Post-M3)

**Canonical location:** TypeBox `default` in `schema.ts`

Priority cascade:
1. Schema defaults (lowest) — applied by `parseConfig()`
2. Preset values — applied by `applyPresets()`
3. User overrides (highest) — applied by `deepMerge()`

**Rules:**
- New parameters: Add `default` in schema ONLY
- Presets: Override schema defaults for specific themes
- Domain functions: MUST NOT have local defaults — rely on validated config

**Anti-pattern:** Defining defaults in function parameters

**Adding a new config parameter:**
1. Add field to appropriate schema in `src/config/schema.ts` with `default`
2. Export type from `src/config/index.ts` if new type
3. Reference in step/domain code via `context.config`
4. Optionally add to a preset if theme-specific override needed
```

### Fix 3: Narrative steps.ts Barrel

Create `packages/mapgen-core/src/pipeline/narrative/steps.ts`:

```typescript
export { createStorySeedStep } from "./StorySeedStep.js";
export { createStoryHotspotsStep } from "./StoryHotspotsStep.js";
export { createStoryRiftsStep } from "./StoryRiftsStep.js";
export { createStoryOrogenyStep } from "./StoryOrogenyStep.js";
export { createStoryCorridorsPreStep, createStoryCorridorsPostStep } from "./StoryCorridorsStep.js";
export { createStorySwatchesStep } from "./StorySwatchesStep.js";
```

Update `packages/mapgen-core/src/pipeline/narrative/index.ts` imports to use `./steps.js`.

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/mapgen-core/src/pipeline/AGENTS.md` | Create |
| `packages/mapgen-core/src/config/AGENTS.md` | Extend |
| `packages/mapgen-core/src/pipeline/narrative/steps.ts` | Create |
| `packages/mapgen-core/src/pipeline/narrative/index.ts` | Update imports |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
