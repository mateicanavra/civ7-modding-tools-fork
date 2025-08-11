# @civ7/config

Utilities for loading and resolving paths from the `civ.config.jsonc` file used by the `civ7` CLI.

## Features

- Expand `~` in paths and detect the project root
- Load `civ.config.jsonc` and merge profile overrides
- Resolve install, zip, unzip and graph output locations
- JSON schema for editor validation

## JSON Schema

`schema/civ.config.schema.json` provides a [JSON Schema](https://json-schema.org/) for configuration files.
Include the schema in your `civ.config.jsonc` to enable completions:

```jsonc
{
  "$schema": "./node_modules/@civ7/config/schema/civ.config.schema.json"
}
```

## Build

This package is bundled with [tsup](https://tsup.egoist.dev/). Run `pnpm -F @civ7/config build` to generate the `dist/` outputs.
