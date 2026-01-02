---
id: CIV-28
title: "[M2] Implement parseConfig loader and validation helpers"
state: done
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Architecture]
parent: CIV-26
children: []
blocked_by: [CIV-27]
blocked: [CIV-29]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Implement the `parseConfig` helper and related utilities that validate raw configuration against `MapGenConfigSchema`, apply defaults, and fail fast on invalid inputs. This is the runtime validation layer for config hygiene.

## Deliverables

- [x] Create `packages/mapgen-core/src/config/loader.ts` with:
  - `parseConfig(input: unknown): MapGenConfig` — throws on validation failure
  - `safe-parse helper(input: unknown): ParseResult` — returns success/failure with errors
  - `default-config helper(): MapGenConfig` — returns a fully-defaulted config
  - `json-schema helper(): object` — exports JSON Schema for external tooling
- [x] Use TypeBox `Compile` for high-performance validation
- [x] Use TypeBox `Value` utilities for defaults (Clone → Default → Convert → Clean)
- [x] Add `public-schema helper()` helper to filter internal fields for public tooling
- [x] Export helpers from `packages/mapgen-core/src/config/index.ts`
- [x] Add unit tests for validation edge cases

## Acceptance Criteria

- [x] `parseConfig({})` returns a valid `MapGenConfig` with all defaults applied
- [x] `parseConfig({ foundation: { plates: { count: 50 } } })` throws (count > max)
- [x] `parseConfig({ foundation: { plates: { count: "invalid" } } })` throws (wrong type)
- [x] `safe-parse helper` returns `{ success: false, errors: [...] }` on invalid input
- [x] `default-config helper()` returns config that passes validation
- [x] `json-schema helper()` returns valid JSON Schema object
- [x] Clear error messages indicate which field failed and why
- [x] TypeScript compiles without errors

## Testing / Verification

```bash
# Unit tests
pnpm -C packages/mapgen-core test

# Type check
pnpm -C packages/mapgen-core check-types

# Build
pnpm -C packages/mapgen-core build

# Manual validation test
node -e "
  const { parseConfig, safe-parse helper, default-config helper } = await import('@swooper/mapgen-core/config');
  console.log('Default config:', JSON.stringify(default-config helper(), null, 2));
  console.log('Parse empty:', JSON.stringify(parseConfig({}), null, 2));
  try { parseConfig({ foundation: { plates: { count: 'bad' } } }); }
  catch (e) { console.log('Expected error:', e.message); }
"
```

## Dependencies / Notes

- **Parent Issue**: CIV-26 (Config Hygiene & Fail-Fast Validation)
- **Blocked by**: CIV-27 (needs schema definition)
- **Blocks**: CIV-29 (will use parseConfig in bootstrap)
- **PRD Reference**: `resources/PRD-config-refactor.md` (Phase 1, Section 5.2)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Loader Implementation

```typescript
// config/loader.ts
import { Compile } from "typebox/compile";
import { Value } from "typebox/value";
import { MapGenConfigSchema, INTERNAL_METADATA_KEY, type MapGenConfig } from "./schema.js";

// Compile schema once for performance
const compiled = Compile(MapGenConfigSchema);

export interface ParseResult {
  success: boolean;
  config?: MapGenConfig;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Parse and validate raw config, throwing on failure.
 * Applies defaults via Value.Default.
 */
export function parseConfig(input: unknown): MapGenConfig {
  // Clone → Default → Convert → Clean pipeline
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(MapGenConfigSchema, cloned);
  const converted = Value.Convert(MapGenConfigSchema, defaulted);
  const cleaned = Value.Clean(MapGenConfigSchema, converted);

  // Validate
  if (!compiled.Check(cleaned)) {
    const errors = [...compiled.Errors(cleaned)];
    const messages = errors.map(e => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid MapGenConfig: ${messages}`);
  }

  return cleaned as MapGenConfig;
}

/**
 * Safe parse that returns success/failure instead of throwing.
 */
export function safe-parse helper(input: unknown): ParseResult {
  try {
    const config = parseConfig(input);
    return { success: true, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errors: [{ path: "", message }]
    };
  }
}

/**
 * Get a fully-defaulted config.
 */
export function default-config helper(): MapGenConfig {
  return parseConfig({});
}

/**
 * Export JSON Schema for external tooling (includes internal fields).
 */
export function json-schema helper(): object {
  return JSON.parse(JSON.stringify(MapGenConfigSchema));
}

/**
 * Export filtered JSON Schema excluding internal fields.
 * Use for public tooling, editor integrations, and documentation.
 */
export function public-schema helper(): object {
  const fullSchema = JSON.parse(JSON.stringify(MapGenConfigSchema));
  return filterInternalFields(fullSchema) ?? {};
}
```

### Error Message Format

```
Invalid MapGenConfig: /foundation/plates/count: Expected number; /landmass/baseWaterPercent: Expected number between 0 and 100
```

### Test Cases

```typescript
// config/loader.test.ts
describe("parseConfig", () => {
  it("returns defaults for empty input", () => {
    const config = parseConfig({});
    expect(config.foundation?.plates?.count).toBe(8);
  });

  it("preserves valid overrides", () => {
    const config = parseConfig({ foundation: { plates: { count: 12 } } });
    expect(config.foundation?.plates?.count).toBe(12);
  });

  it("throws on invalid type", () => {
    expect(() => parseConfig({ foundation: { plates: { count: "bad" } } }))
      .toThrow("Invalid MapGenConfig");
  });

  it("throws on out-of-range value", () => {
    expect(() => parseConfig({ foundation: { plates: { count: 100 } } }))
      .toThrow("Invalid MapGenConfig");
  });
});

describe("safe-parse helper", () => {
  it("returns success for valid input", () => {
    const result = safe-parse helper({});
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
  });

  it("returns errors for invalid input", () => {
    const result = safe-parse helper({ foundation: { plates: { count: "bad" } } });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
