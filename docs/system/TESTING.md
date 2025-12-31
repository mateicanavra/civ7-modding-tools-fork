# Testing

This repository uses [Vitest](https://vitest.dev/) for unit tests across most workspaces, and [Bun](https://bun.sh/) (`bun test`) for `@swooper/mapgen-core`.

## Running all tests

```bash
pnpm test
```

Runs:

- `vitest` across all configured projects in `vitest.config.ts`
- `bun test` for `@swooper/mapgen-core`
- `bun test` for `mods/mod-swooper-maps`

To run only the Vitest projects:

```bash
pnpm test:vitest
```

To run only the mapgen-core Bun tests:

```bash
pnpm test:mapgen
```

To run only the mod tests:

```bash
pnpm -C mods/mod-swooper-maps test
```

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
