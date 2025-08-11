# @civ7/plugin-graph

Utilities for crawling and rendering Civilization‑style XML graphs.

## Usage

Install `fast-xml-parser` alongside the plugin:

```bash
pnpm add @civ7/plugin-graph fast-xml-parser
```

### crawlGraph

```ts
import { crawlGraph } from '@civ7/plugin-graph';

const { graph, manifestFiles } = await crawlGraph('/path/to/xml', 'Resources/Cotton');
```

### exploreGraph

```ts
import { exploreGraph } from '@civ7/plugin-graph';

const result = await exploreGraph({
  rootDir: '/path/to/xml',
  seed: 'Resources/Cotton',
  engine: 'dot',
  emitHtml: true,
});

console.log(result.svg);
```

`crawlGraph` returns the raw graph and manifest file list. `exploreGraph` wraps it with DOT, JSON, SVG, and optional HTML, keeping all file I/O outside the package.
