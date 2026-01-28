# Testing

This package uses [Vitest](https://vitest.dev/).

## Running tests

```bash
bun run --filter @civ7/plugin-graph test
```

## Current smoke tests

- `crawlGraph` and `exploreGraph` workflows build graphs and render SVG.
- Invalid seeds surface descriptive errors and log progress when a logger is provided.

## Suggested future tests

- Edge cases for graph export and renderer options.
