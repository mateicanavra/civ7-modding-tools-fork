# Testing

This package uses [Vitest](https://vitest.dev/).

## Running tests

```bash
pnpm -F @civ7/config test
```

## Current status

No unit tests exist yet. Add `*.test.ts` files under `src/` or a `test/` directory and register the package in `vitest.config.ts`.

## Suggested future tests

- Path resolution helpers handle profile overrides
- Default directory fallbacks for unsupported platforms
