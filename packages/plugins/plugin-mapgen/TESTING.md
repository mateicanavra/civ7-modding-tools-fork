# Testing

This package uses Vitest. To run the tests:

```sh
pnpm -F @civ7/plugin-mapgen run build
pnpm -F @civ7/plugin-mapgen run test
```

The `dist-match` test ensures that TypeScript sources compile to JavaScript
that matches the archived legacy implementations under `js-archive/`.
