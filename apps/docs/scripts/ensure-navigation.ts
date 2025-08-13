import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface NavigationGroup {
  group: string;
  pages: Array<string | { group: string; pages: string[] }>;
}

interface DocsConfig {
  $schema?: string;
  name?: string;
  theme?: string;
  favicon?: string;
  colors?: { primary?: string };
  navigation?: NavigationGroup[];
  [key: string]: unknown;
}

function main(): void {
  const docsPath = resolve(process.cwd(), 'docs.json');
  const migratedIndex = resolve(process.cwd(), 'pages', 'migrated', 'index.mdx');
  if (!existsSync(docsPath)) return;
  const json = JSON.parse(readFileSync(docsPath, 'utf8')) as DocsConfig;
  if (!json.navigation) json.navigation = [];

  const hasMigrated = existsSync(migratedIndex);
  if (hasMigrated) {
    const alreadyReferenced = json.navigation.some((g) =>
      Array.isArray(g.pages) && g.pages.some((p) => (typeof p === 'string' ? p === '/migrated' : false))
    );
    if (!alreadyReferenced) {
      json.navigation.push({ group: 'Legacy', pages: ['/migrated'] });
    }
  }

  writeFileSync(docsPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

main();