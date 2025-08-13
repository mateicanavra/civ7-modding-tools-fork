/*
  Update fenced code blocks in MDX files to include a language per Mintlify requirements:
  - Ensure a language token is present immediately after the opening backticks
  - Infer language when missing with heuristics (xml, sql, bash, typescript, ini, text, javascript)
  - Normalize common aliases (ts -> typescript, js -> javascript, sh/zsh -> bash, plaintext/txt -> text)
  - Preserve any existing meta options after the language token (e.g., lines, focus, highlight, custom attrs)
  - Do not touch code contents or closing fences

  Usage: bun run scripts/update-code-blocks.ts
*/

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// This script is executed from apps/docs; use that as the root for docs
const OFFICIAL_DIR = join(process.cwd(), 'official');
const COMMUNITY_DIR = join(process.cwd(), 'community');

type Detection = {
  language: string;
  reason: string;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  console: 'bash',
  plaintext: 'text',
  txt: 'text',
  md: 'markdown',
  yml: 'yaml',
  json5: 'json',
  jsonc: 'json',
};

function normalizeLanguageToken(token: string | undefined): string | undefined {
  if (!token) return token;
  const lower = token.trim().toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

function detectLanguage(code: string): Detection {
  const snippet = code.slice(0, 2000); // limit for perf
  const lowered = snippet.toLowerCase();
  const lines = snippet.split(/\r?\n/);

  // xml: XML declaration or typical tags
  if (/<\?xml\s+version\s*=/.test(snippet) || /<database[\s>]/i.test(snippet) || /<gameeffects[\s>]/i.test(snippet) || /<mod[\s>]/i.test(snippet)) {
    return { language: 'xml', reason: 'xml-structure' };
  }

  // sql: common DDL/DML patterns
  if (/(^|\n)\s*(insert\s+into|update\s+|delete\s+from|select\s+.+\s+from)\b/i.test(snippet)) {
    return { language: 'sql', reason: 'sql-keywords' };
  }

  // ini-like: lines with ';' comments and KEY VALUE patterns
  const iniLike = lines.every(l => l.trim() === '' || l.trim().startsWith(';') || /^[A-Za-z0-9_.-]+\s+[^<>{}]+$/.test(l));
  if (iniLike && lines.some(l => l.trim().startsWith(';'))) {
    return { language: 'ini', reason: 'ini-comment-style' };
  }

  // bash/terminal: typical commands
  const bashSignals = [
    /^\s*#\s/, // comment lines
    /^\s*(mkdir|cd|ls|cat|touch|echo|rm|cp|mv|pnpm|npm|yarn|bun|git|npx|chmod|chown|ts-node)\b/,
  ];
  if (lines.every(l => l.trim() === '' || bashSignals.some(rx => rx.test(l)))) {
    return { language: 'bash', reason: 'terminal-commands' };
  }

  // typescript: imports/exports and TS types or patterns
  if (/(^|\n)\s*import\s+[^;]+from\s+['"][^'"]+['"]/i.test(snippet) || /(interface|type)\s+\w+\s*=|:\s*\w+/.test(snippet)) {
    return { language: 'typescript', reason: 'ts-syntax' };
  }

  // javascript fallback when code-ish
  if (/(^|\n)\s*(const|let|var|function|class)\s+/.test(snippet)) {
    return { language: 'javascript', reason: 'js-syntax' };
  }

  // xml-like generic tag detection (but avoid html fragments in docs text)
  if (/<[A-Za-z][A-Za-z0-9_-]*[\s>]/.test(snippet) && /<\/?[A-Za-z]/.test(snippet)) {
    return { language: 'xml', reason: 'tag-structure' };
  }

  return { language: 'text', reason: 'default' };
}

function processFile(filePath: string): { updated: boolean; before: string; after: string } {
  const original = readFileSync(filePath, 'utf8');

  const lines = original.split(/\r?\n/);
  const out: string[] = [];

  let i = 0;
  let changed = false;

  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(/^(```+)(.*)$/);
    if (!fenceMatch) {
      out.push(line);
      i += 1;
      continue;
    }

    const fence = fenceMatch[1];
    const infoRaw = fenceMatch[2] ?? '';
    const infoTokens = infoRaw.trim().split(/\s+/).filter(Boolean);

    const existingLanguageRaw = infoTokens.length > 0 ? infoTokens[0] : undefined;
    let existingLanguage = normalizeLanguageToken(existingLanguageRaw);
    let metaTokens: string[] = [];

    if (existingLanguage && /^[a-z0-9+#-]+$/i.test(existingLanguage)) {
      // Treat the first token as language; rest are meta
      metaTokens = infoTokens.slice(1);
    } else {
      // No language specified; all tokens are meta
      existingLanguage = undefined;
      metaTokens = infoTokens;
    }

    // Capture block content until closing fence
    const blockStart = i + 1;
    let j = blockStart;
    while (j < lines.length && !lines[j].startsWith(fence)) {
      j += 1;
    }
    const blockEnd = j; // index of closing fence or lines.length
    const codeBody = lines.slice(blockStart, blockEnd).join('\n');

    // Determine final language
    let finalLanguage = existingLanguage;
    if (!finalLanguage) {
      finalLanguage = detectLanguage(codeBody).language;
    }

    // If language normalization changed or was added, we will update
    const normalizedExisting = existingLanguageRaw ? normalizeLanguageToken(existingLanguageRaw) : undefined;
    const needsHeaderUpdate = !normalizedExisting || normalizedExisting !== finalLanguage;

    if (needsHeaderUpdate) {
      changed = true;
    }

    const newHeader = `${fence}${finalLanguage ? ' ' + finalLanguage : ''}${metaTokens.length ? ' ' + metaTokens.join(' ') : ''}`;

    out.push(newHeader);
    // push body as-is
    for (let k = blockStart; k < blockEnd; k++) out.push(lines[k]);
    // closing fence (or EOF safeguard)
    if (blockEnd < lines.length) {
      out.push(lines[blockEnd]);
      i = blockEnd + 1;
    } else {
      i = blockEnd;
    }
  }

  const updated = out.join('\n');
  if (changed && updated !== original) {
    writeFileSync(filePath, updated, 'utf8');
  }
  return { updated: changed && updated !== original, before: original, after: updated };
}

function walkDir(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkDir(full, acc);
    } else if (st.isFile() && (extname(full) === '.mdx' || extname(full) === '.md')) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const targets = [OFFICIAL_DIR, COMMUNITY_DIR];
  let filesProcessed = 0;
  let filesChanged = 0;
  for (const base of targets) {
    const files = walkDir(base);
    for (const file of files) {
      const { updated } = processFile(file);
      filesProcessed += 1;
      if (updated) filesChanged += 1;
    }
  }
  console.log(`Code fences normalized. Files processed: ${filesProcessed}. Files changed: ${filesChanged}.`);
}

main();


