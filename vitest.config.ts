import { defineConfig } from 'vitest/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const r = (p: string) => join(dirname(fileURLToPath(import.meta.url)), p);

export default defineConfig({
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        root: r('packages/cli'),
        test: {
          name: 'cli',
          env: {
            // Ensure oclif does not attempt to load dev plugins (like @oclif/plugin-plugins)
            // during tests; treat tests as production to suppress noisy warnings.
            NODE_ENV: 'production',
          },
        }
      },
      {
        extends: true,
        root: r('packages/config'),
        test: { name: 'config' }
      },
      {
        extends: true,
        root: r('packages/sdk'),
        test: { name: 'sdk' }
      },
      {
        extends: true,
        root: r('apps/docs'),
        test: { name: 'docs' }
      },
      {
        extends: true,
        root: r('apps/playground'),
        test: { name: 'playground' }
      },
      {
        extends: true,
        root: r('packages/plugins/plugin-files'),
        test: { name: 'plugin-files' }
      },
      {
        extends: true,
        root: r('packages/plugins/plugin-graph'),
        test: { name: 'plugin-graph' }
      },
      {
        extends: true,
        root: r('packages/plugins/plugin-mapgen'),
        test: { name: 'plugin-mapgen' }
      }
    ]
  }
});
