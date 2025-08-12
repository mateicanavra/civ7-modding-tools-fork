# Testing

This package uses [Vitest](https://vitest.dev/).

## Running tests

- Run all projects (recommended):
  ```bash
  pnpm test
  ```
- Run only this package's tests:
  ```bash
  npx vitest run packages/config/test
  ```

## Current status

Unit tests exist under `packages/config/test/`, covering path and directory resolvers (`expandPath`, `resolveZipPath`, `resolveUnzipDir`, `resolveGraphOutDir`, `resolveInstallDir`).

## Suggested future tests

- Additional profile override combinations and edge cases
- Platform-specific defaults beyond darwin/win32
