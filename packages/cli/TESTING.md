# Testing

This package uses [Vitest](https://vitest.dev/) with the Node environment. Tests live in `test/commands` and `test/utils`.

## Running tests

```bash
pnpm --filter @civ7/cli test
```

## Current smoke tests

- `expandPath` expands `~` to the user's home directory.
- `crawl` and `explore` commands delegate to `@civ7/plugin-graph` workflows.

## Suggested future tests

- `findProjectRoot` locates the workspace root.
- CLI commands produce expected output files.
