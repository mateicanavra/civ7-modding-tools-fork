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
  navigation?: Record<string, Array<string | { group: string; pages: string[] }>> | NavigationGroup[];
  [key: string]: unknown;
}

function main(): void {
  const docsPath = resolve(process.cwd(), 'docs.json');
  const migratedIndex = resolve(process.cwd(), 'pages', 'migrated', 'index.mdx');
  if (!existsSync(docsPath)) return;
  const json = JSON.parse(readFileSync(docsPath, 'utf8')) as DocsConfig;

  // If navigation is an array (legacy), convert to object shape
  if (Array.isArray(json.navigation)) {
    const navArray = json.navigation as NavigationGroup[];
    const converted: Record<string, Array<string | { group: string; pages: string[] }>> = {};
    for (const group of navArray) {
      if (group && typeof group === 'object' && 'group' in group && Array.isArray(group.pages)) {
        converted[(group as NavigationGroup).group] = (group as NavigationGroup).pages;
      }
    }
    json.navigation = converted;
  }

  if (!json.navigation || Array.isArray(json.navigation)) {
    json.navigation = {};
  }

  // Keep navigation normalized but do not auto-insert any groups/pages
  const _navObject = json.navigation as Record<string, Array<string | { group: string; pages: string[] }>>;

  writeFileSync(docsPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

main();