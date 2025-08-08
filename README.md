# Civ7 Modding Tools and Resources

This repository is a community‑maintained fork of [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools). It has been reorganized into a pnpm monorepo powered by Turborepo.

## Monorepo Structure
- `packages/sdk` – reusable TypeScript SDK for building Civilization VII mods
- `packages/cli` – command line interface for exploring game data (`civ7`)
- `packages/config` – shared TypeScript/ESLint/Prettier configuration
- `packages/docs-plugins` – Docsify plugins
- `apps/docs` – Docsify app serving Markdown from `./docs`
- `apps/playground` – example scripts and generators using the SDK

## Development
```bash
pnpm install       # install dependencies
pnpm build         # build all packages
pnpm lint          # lint all packages
pnpm test          # run tests (where present)
pnpm docs:dev      # serve docs on http://localhost:4000
pnpm --filter @civ7/playground dev   # run playground example
pnpm --filter @civ7/cli publish:local # link CLI globally
```

## Contributing
- **Docs & content**: edit Markdown under `/docs`
- **Code**: use the standard pnpm + Turbo commands above
