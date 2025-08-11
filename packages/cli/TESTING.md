# Testing

This package uses [Vitest](https://vitest.dev/) with the Node environment. Tests live in `test/commands` and `test/utils`.

## Running tests

```bash
pnpm --filter @civ7/cli test
```

## Current smoke tests

- `expandPath` expands `~` to the user's home directory.
- `crawl` and `explore` commands delegate to `@civ7/plugin-graph` pipelines.
- `render` delegates to `renderSvg` without touching the real filesystem.
- `slice` copies files listed in a manifest.
- `zip` and `unzip` delegate to `@civ7/plugin-files`.

## Suggested future tests

- `findProjectRoot` locates the workspace root.
- CLI commands produce expected output files.
