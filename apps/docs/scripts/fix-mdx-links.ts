#!/usr/bin/env -S bun run

import { promises as fs } from 'node:fs';
import * as fssync from 'node:fs';
import * as path from 'node:path';

async function listMdxFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        // Skip common non-content directories
        if (['node_modules', '.archive', '.turbo', 'public', 'test', 'scripts'].includes(entry.name)) return [];
        return listMdxFiles(fullPath);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.mdx')) return [fullPath];
      return [] as string[];
    })
  );
  return files.flat();
}

type Replacement = { pattern: RegExp; replacement: string };

const replacements: Replacement[] = [
  // Collapse duplicated segments
  { pattern: /\/community\/guides\/guides\//g, replacement: '/community/guides/' },
  { pattern: /\/community\/reference\/reference\//g, replacement: '/community/reference/' },
  { pattern: /\/community\/reference\/guides\//g, replacement: '/community/guides/' },
  { pattern: /\/community\/guides\/ages\/guides\/ages\//g, replacement: '/community/guides/ages/' },
  { pattern: /\/community\/guides\/learning-paths\/guides\//g, replacement: '/community/guides/learning-paths/' },
  { pattern: /\/community\/guides\/legacy-paths\/guides\//g, replacement: '/community/guides/legacy-paths/' },
  { pattern: /\/community\/guides\/legends\/guides\//g, replacement: '/community/guides/legends/' },
  { pattern: /\/community\/guides\/typescript\/guides\/typescript\//g, replacement: '/community/guides/typescript/' },
  { pattern: /\/community\/guides\/typescript\/howto\/guides\/typescript\/howto\//g, replacement: '/community/guides/typescript/howto/' },
  { pattern: /\/community\/guides\/typescript\/howto\/guides\/typescript\//g, replacement: '/community/guides/typescript/' },
  { pattern: /\/community\/guides\/typescrip\b/g, replacement: '/community/guides/typescript' },
  { pattern: /\/community\/guides\/ages\/guides\//g, replacement: '/community/guides/ages/' },
  { pattern: /\((?:\s*)\/guides\/typescript\/howto\//g, replacement: '(/community/guides/typescript/howto/' },
  { pattern: /\((?:\s*)\/guides\/ages\//g, replacement: '(/community/guides/ages/' },

  // Specific renames
  { pattern: /\/community\/guides\/creating-civilizations(?![A-Za-z0-9/_-])/g, replacement: '/community/guides/general-creating-civilizations' },
  { pattern: /\/community\/guides\/creating-leaders(?![A-Za-z0-9/_-])/g, replacement: '/community/guides/general-creating-leaders' },
  { pattern: /\/community\/guides\/modifying-existing-content(?![A-Za-z0-9/_-])/g, replacement: '/community/guides/general-modifying-content' },
  { pattern: /\/community\/reference\/reference\/map-system(?![A-Za-z0-9/_-])/g, replacement: '/community/reference/gameplay-mechanics' },
  { pattern: /\/community\/reference\/map-system(?![A-Za-z0-9/_-])/g, replacement: '/community/reference/gameplay-mechanics' },
  { pattern: /\/community\/guides\/reference\/file-paths-reference/g, replacement: '/community/reference/file-paths-reference' },
  { pattern: /\/community\/guides\/age-modules(?![A-Za-z0-9/_-])/g, replacement: '/community/guides/ages/age-modules' },
  { pattern: /\/community\/guides\/learning-paths\/getting-started/g, replacement: '/community/guides/getting-started' },
  { pattern: /\/community\/guides\/learning-paths\/typescript\/howto\/index/g, replacement: '/community/guides/typescript/howto/index' },
  { pattern: /\/community\/guides\/learning-paths\/modding-architecture/g, replacement: '/community/guides/modding-architecture' },
  { pattern: /\/community\/guides\/legacy-paths\/modding-architecture/g, replacement: '/community/guides/modding-architecture' },
  { pattern: /\/community\/guides\/legacy-paths\/database-schemas/g, replacement: '/community/guides/database-schemas' },
  { pattern: /\/community\/guides\/legends\/ages\//g, replacement: '/community/guides/ages/' },
  { pattern: /\/community\/guides\/legends\/typescript\//g, replacement: '/community/guides/typescript/' },

  // Official site rewrites (avoid images/ in guides)
  { pattern: /\/civ7-official\/modding\/guides\/(?!images\/)/g, replacement: '/official/guides/' },
  { pattern: /\/civ7-official\/modding\/examples\//g, replacement: '/official/examples/' },
];

function applyReplacements(input: string): { output: string; changed: number } {
  let output = input;
  let changed = 0;
  for (const { pattern, replacement } of replacements) {
    const before = output;
    output = output.replace(pattern, replacement);
    if (output !== before) changed++;
  }
  return { output, changed };
}

async function main(): Promise<void> {
  const root = process.cwd();
  const files = await listMdxFiles(root);
  let totalFiles = 0;
  let totalChanged = 0;
  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    const { output, changed } = applyReplacements(original);
    if (changed > 0 && output !== original) {
      await fs.writeFile(file, output, 'utf8');
      totalFiles++;
      totalChanged += changed;
      console.log(`Updated ${path.relative(root, file)} (${changed} rules)`);
    }
  }
  console.log(`\n✅ Link normalization complete. Files updated: ${totalFiles}. Rules applied: ${totalChanged}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


