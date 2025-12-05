# Testing

This repository uses [Vitest](https://vitest.dev/) for unit tests across all workspaces.

## Running all tests

```bash
pnpm test
```

Executes `vitest` across all configured projects defined in `vitest.config.ts`.

## Visualizing test runs

```bash
pnpm test:ui
```

Opens the interactive Vitest UI for all workspaces.

## Running a single workspace

```bash
pnpm vitest --project <name>
```

Use the project name from `vitest.config.ts` (`cli`, `sdk`, `docs`, or `playground`) to target an individual suite.

Each app and package includes a minimal smoke test and a local `TESTING.md` describing recommended scenarios to cover.
