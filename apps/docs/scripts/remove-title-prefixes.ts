import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const OFFICIAL_DIR = join(process.cwd(), 'official');
const COMMUNITY_DIR = join(process.cwd(), 'community');
const CONFIG_PATH = join(process.cwd(), 'title-prefixes.config.json');

type Config = { prefixes: string[] };

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return { prefixes: [
      'Civilization VII Typescript Modding Tools',
      'Typescript Modding Tools'
    ] };
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    if (!parsed.prefixes || !Array.isArray(parsed.prefixes) || parsed.prefixes.length === 0) {
      return { prefixes: [
        'Civilization VII Typescript Modding Tools',
        'Typescript Modding Tools'
      ] };
    }
    return { prefixes: parsed.prefixes } as Config;
  } catch {
    return { prefixes: [
      'Civilization VII Typescript Modding Tools',
      'Typescript Modding Tools'
    ] };
  }
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (st.isFile() && (extname(full) === '.mdx' || extname(full) === '.md')) acc.push(full);
  }
  return acc;
}

function parseFrontmatter(text: string): { hasFm: boolean; fmStart: number; fmEnd: number; titleLineIdx: number; lines: string[] } {
  if (!text.startsWith('---')) return { hasFm: false, fmStart: 0, fmEnd: 0, titleLineIdx: -1, lines: text.split(/\r?\n/) };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { hasFm: false, fmStart: 0, fmEnd: 0, titleLineIdx: -1, lines: text.split(/\r?\n/) };
  const fmStart = 0;
  const fmEnd = end + '\n---'.length;
  const lines = text.slice(0, fmEnd).split(/\r?\n/);
  let titleLineIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^title\s*:/.test(lines[i])) { titleLineIdx = i; break; }
  }
  return { hasFm: true, fmStart, fmEnd, titleLineIdx, lines };
}

function stripPrefix(title: string, prefixes: string[]): string {
  const sorted = [...prefixes].sort((a, b) => b.length - a.length);
  let out = title.trim();
  for (const p of sorted) {
    const pl = p.trim();
    if (out.toLowerCase().startsWith(pl.toLowerCase())) {
      out = out.slice(pl.length).trimStart();
      // Remove common separators immediately following prefix
      out = out.replace(/^[-:|–—]\s+/, '');
      break;
    }
  }
  return out.trim();
}

function updateTitleInFile(filePath: string, prefixes: string[]): boolean {
  const original = readFileSync(filePath, 'utf8');
  const { hasFm, fmEnd, titleLineIdx, lines } = parseFrontmatter(original);
  if (!hasFm || titleLineIdx === -1) return false;

  const titleLine = lines[titleLineIdx];
  const mQuoted = titleLine.match(/^title\s*:\s*"([^"]*)"\s*$/);
  const mSQuoted = titleLine.match(/^title\s*:\s*'([^']*)'\s*$/);
  const mBare = titleLine.match(/^title\s*:\s*(.+?)\s*$/);

  let currentTitle: string | undefined;
  let quote: 'double' | 'single' | 'none' = 'none';
  if (mQuoted) { currentTitle = mQuoted[1]; quote = 'double'; }
  else if (mSQuoted) { currentTitle = mSQuoted[1]; quote = 'single'; }
  else if (mBare) { currentTitle = mBare[1].trim(); quote = 'none'; }
  if (!currentTitle) return false;

  const newTitle = stripPrefix(currentTitle, prefixes);
  if (!newTitle || newTitle === currentTitle) return false;

  const rebuilt = `title: "${newTitle}"`;
  lines[titleLineIdx] = rebuilt;
  const newFrontmatter = lines.join('\n');
  const updated = newFrontmatter + original.slice(fmEnd);
  if (updated !== original) {
    writeFileSync(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

function main(): void {
  const cfg = loadConfig();
  const targets = [OFFICIAL_DIR, COMMUNITY_DIR];
  let processed = 0;
  let changed = 0;
  for (const base of targets) {
    const files = walk(base);
    for (const f of files) {
      processed += 1;
      if (updateTitleInFile(f, cfg.prefixes)) changed += 1;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Title prefix cleanup complete. Files processed: ${processed}. Files changed: ${changed}.`);
}

main();


