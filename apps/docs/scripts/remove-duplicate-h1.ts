import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const OFFICIAL_DIR = join(process.cwd(), 'official');
const COMMUNITY_DIR = join(process.cwd(), 'community');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
    } else if (st.isFile() && (extname(full) === '.mdx' || extname(full) === '.md')) {
      acc.push(full);
    }
  }
  return acc;
}

function extractTitleFromFrontmatter(text: string): { title?: string; fmEndIdx: number } {
  if (!text.startsWith('---')) return { fmEndIdx: 0 };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { fmEndIdx: 0 };
  const fmBlock = text.slice(3, end).trim();
  const fmEndIdx = end + '\n---'.length;
  // Try common title patterns
  const lines = fmBlock.split(/\r?\n/);
  for (const line of lines) {
    const m1 = line.match(/^title:\s*"([^"]*)"\s*$/);
    if (m1) return { title: m1[1], fmEndIdx };
    const m2 = line.match(/^title:\s*'([^']*)'\s*$/);
    if (m2) return { title: m2[1], fmEndIdx };
    const m3 = line.match(/^title:\s*(.+)\s*$/);
    if (m3) return { title: m3[1].trim(), fmEndIdx };
  }
  return { fmEndIdx };
}

function removeDuplicateH1(filePath: string): boolean {
  const original = readFileSync(filePath, 'utf8');
  const { title, fmEndIdx } = extractTitleFromFrontmatter(original);
  if (!title || fmEndIdx === 0) return false;

  // From end of frontmatter, find first non-empty line
  const afterFm = original.slice(fmEndIdx);
  const lines = afterFm.split(/\r?\n/);
  let idx = 0;
  while (idx < lines.length && lines[idx].trim() === '') idx += 1;
  if (idx >= lines.length) return false;

  const firstLine = lines[idx].trim();
  if (!firstLine.startsWith('# ')) return false;
  const headingText = firstLine.replace(/^#\s+/, '').trim();
  if (headingText !== title.trim()) return false;

  // Remove this heading line and a single trailing blank line if present
  const start = fmEndIdx;
  const pre = original.slice(0, start);
  const restLines = lines.slice();
  // Remove heading
  restLines.splice(idx, 1);
  // Remove following blank line
  if (idx < restLines.length && restLines[idx].trim() === '') {
    restLines.splice(idx, 1);
  }
  const updated = pre + restLines.join('\n');
  if (updated !== original) {
    writeFileSync(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

function main(): void {
  const targets = [OFFICIAL_DIR, COMMUNITY_DIR];
  let processed = 0;
  let changed = 0;
  for (const dir of targets) {
    const files = walk(dir);
    for (const f of files) {
      processed += 1;
      if (removeDuplicateH1(f)) changed += 1;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Removed duplicate H1 where matching title. Files processed: ${processed}. Files changed: ${changed}.`);
}

main();


