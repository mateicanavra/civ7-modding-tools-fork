# Testing

This app uses [Vitest](https://vitest.dev/) with the Node environment.

## Running tests

```bash
pnpm --filter @civ7/playground test
```

## Current smoke tests

- Instantiate `Mod` from `@civ7/sdk`.

## Suggested future tests

- Ensure the build script generates an example mod in `dist/`.
- Verify example builders compile without errors.
