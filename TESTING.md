# Testing

This repository uses [Vitest](https://vitest.dev/) for unit tests across all workspaces.

## Running all tests

```bash
pnpm test
```

Runs `vitest` in every workspace through Turborepo. Build artifacts are generated first so packages can import one another.

## Running a single workspace

```bash
pnpm --filter <workspace> test
```

Use the workspace name from `package.json` to run an individual suite.

Each app and package includes a minimal smoke test and a local `TESTING.md` describing recommended scenarios to cover.
