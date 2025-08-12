#!/usr/bin/env -S bun run

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SITE_ROOT = path.resolve(process.cwd(), 'site');
const PAGES_ROOT = path.resolve(process.cwd(), 'pages', 'migrated');
const PUBLIC_MIGRATED_ROOT = path.resolve(process.cwd(), 'public', 'migrated');

const SKIP_FILES = new Set([
  '_sidebar.md',
  '_coverpage.md',
  'index.html',
]);

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function listAllFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) return listAllFiles(full);
      return [full];
    })
  );
  return files.flat();
}

function toPagesPath(siteFile: string): string {
  const rel = path.relative(SITE_ROOT, siteFile);
  const parsed = path.parse(rel);
  const newExt = parsed.ext.toLowerCase() === '.md' || parsed.ext.toLowerCase() === '.markdown' ? '.mdx' : parsed.ext;
  return path.join(PAGES_ROOT, parsed.dir, `${parsed.name}${newExt}`);
}

function toPublicMigratedPath(siteAssetFile: string): string {
  const rel = path.relative(SITE_ROOT, siteAssetFile);
  return path.join(PUBLIC_MIGRATED_ROOT, rel);
}

function rewriteMarkdown(content: string, sourceRelDir: string): { content: string; assets: string[]; title?: string } {
  let updated = content;
  const assets: string[] = [];

  // Extract first H1 as title
  const h1Match = updated.match(/^#\s+(.+)$/m);
  const title = h1Match?.[1]?.trim();

  // Convert HTML comments to MDX comments
  updated = updated.replace(/<!--([\s\S]*?)-->/g, (_m, p1: string) => `{/*${p1.trim()}*/}`);

  // Rewrite links from something.md to /migrated/something
  updated = updated.replace(/\]\(([^)]+\.md)\)/g, (_, p1: string) => {
    const clean = p1.replace(/#.*/, '');
    const withoutExt = clean.replace(/\.md$/i, '').replace(/\.markdown$/i, '');
    const abs = '/' + path.posix.join('migrated', path.posix.normalize(path.posix.join(sourceRelDir.replaceAll('\\', '/'), withoutExt)));
    return `](${abs})`;
  });

  // Collect and rewrite image references ![alt](path)
  updated = updated.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (m: string, imgPath: string) => {
    // Ignore URLs (http/https)
    if (/^https?:\/\//i.test(imgPath)) return m;
    const normalized = path.posix.normalize(path.posix.join(sourceRelDir.replaceAll('\\', '/'), imgPath));
    const publicPath = '/' + path.posix.join('migrated', normalized);
    assets.push(normalized);
    return m.replace(imgPath, publicPath);
  });

  return { content: updated, assets: Array.from(new Set(assets)), title };
}

async function copyAsset(relFromSite: string): Promise<void> {
  const src = path.join(SITE_ROOT, relFromSite);
  const dest = path.join(PUBLIC_MIGRATED_ROOT, relFromSite);
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest).catch(async () => {
    // If it's not a file (e.g., missing), ignore
  });
}

async function migrate(): Promise<void> {
  if (!existsSync(SITE_ROOT)) {
    console.error(`site/ not found at ${SITE_ROOT}`);
    process.exit(1);
  }

  const all = await listAllFiles(SITE_ROOT);
  const mdFiles = all.filter((f) => f.endsWith('.md') || f.endsWith('.markdown')).filter((f) => !SKIP_FILES.has(path.basename(f)));

  let migratedCount = 0;
  for (const file of mdFiles) {
    const rel = path.relative(SITE_ROOT, file).replaceAll('\\', '/');
    const relDir = path.posix.dirname(rel);
    const dest = toPagesPath(file);
    await ensureDir(path.dirname(dest));
    const original = await fs.readFile(file, 'utf8');
    const { content, assets, title } = rewriteMarkdown(original, relDir);
    const frontmatter = `---\n${title ? `title: ${title}\n` : ''}---\n\n`;
    await fs.writeFile(dest, frontmatter + content, 'utf8');
    migratedCount++;
    for (const assetRel of assets) {
      await copyAsset(assetRel);
    }
  }

  // Create a simple index page for migrated content
  const indexPath = path.join(PAGES_ROOT, 'index.mdx');
  await ensureDir(path.dirname(indexPath));
  await fs.writeFile(indexPath, `---\ntitle: Migrated Docs\n---\n\nThis section contains content migrated from the legacy Docsify site.\n`, 'utf8');

  console.log(`Migrated ${migratedCount} markdown files to pages/migrated as MDX.`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});


