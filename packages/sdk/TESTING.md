# Testing

This package uses [Vitest](https://vitest.dev/) in the Node environment.

## Running tests

```bash
bun run --filter @mateicanavra/civ7-sdk test
```

## Current smoke tests

- `Mod` initializes with default values.
- `BaseBuilder.fill` updates known properties and triggers migration.
- `BaseFile.modInfoPath` resolves modinfo-relative paths.
- `Mod` adds builders and files and invokes their `build`/`write` methods.
- `Mod.build` outputs a modinfo referencing generated files.
- `CivilizationBuilder` migrates trait types and produces core XML files.

## Suggested future tests

- Additional builder coverage and XML validation.
- Constant exports match game data.
