# @civ7/plugin-graph

Utilities for crawling and rendering Civilization‑style XML graphs.

## Usage

Install the plugin:

```bash
pnpm add @civ7/plugin-graph
```

The library bundles `fast-xml-parser` for XML parsing and `@hpcc-js/wasm` for Graphviz rendering.

### crawlGraph

```ts
import { crawlGraph } from '@civ7/plugin-graph';

const { graph, manifestFiles } = await crawlGraph('/path/to/xml', 'Resources/Cotton', console.log);
```

### exploreGraph

```ts
import { exploreGraph } from '@civ7/plugin-graph';

const result = await exploreGraph({
  rootDir: '/path/to/xml',
  seed: 'Resources/Cotton',
  engine: 'dot',
  emitHtml: true,
  log: console.log,
});

console.log(result.svg);
```

`crawlGraph` returns the raw graph and manifest file list. `exploreGraph` wraps it with DOT, JSON, SVG, and optional HTML, keeping all file I/O outside the package. Both pipelines accept an optional `log` callback for progress messages and throw errors with context if crawling or rendering fails.
