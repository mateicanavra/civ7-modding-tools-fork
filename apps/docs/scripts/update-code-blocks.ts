/*
  Update fenced code blocks in MDX files to include a language per Mintlify requirements:
  - Ensure a language token is present immediately after the opening backticks
  - Infer language when missing with heuristics (xml, sql, bash, typescript, ini, text, javascript)
  - Normalize common aliases (ts -> typescript, js -> javascript, sh/zsh -> bash, plaintext/txt -> text)
  - Preserve any existing meta options after the language token (e.g., lines, focus, highlight, custom attrs)
  - Do not touch code contents or closing fences

  Usage: bun run scripts/update-code-blocks.ts
*/

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { createHash } from 'node:crypto';

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

// Map languages to Font Awesome icon names (fallbacks when no local icon is present)
const LANGUAGE_TO_FA_ICON: Record<string, string> = {
  xml: 'file-code',
  sql: 'file-code',
  bash: 'terminal',
  javascript: 'square-js',
  typescript: 'file-code',
  ini: 'file-lines',
  json: 'file-code',
  yaml: 'file-code',
  markdown: 'file-lines',
  text: 'text',
};

function getIconNameForLanguage(language: string): string {
  // Prefer local icons in public/icons via absolute path under /public
  if (language === 'typescript') return '/icons/icon-code-ts.svg';
  if (language === 'sql') return '/icons/icon-code-sql.svg';
  return LANGUAGE_TO_FA_ICON[language] ?? 'file-code';
}

function normalizeLanguageToken(token: string | undefined): string | undefined {
  if (!token) return token;
  const lower = token.trim().toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

function createShortHash(input: string): string {
  const h = createHash('sha1').update(input).digest('hex');
  return h.substring(0, 8);
}

function buildPageSlug(filePath: string): string {
  const relOfficial = relative(OFFICIAL_DIR, filePath);
  const relCommunity = relative(COMMUNITY_DIR, filePath);
  let rel: string;
  if (!relOfficial.startsWith('..')) {
    rel = join('official', relOfficial);
  } else if (!relCommunity.startsWith('..')) {
    rel = join('community', relCommunity);
  } else {
    rel = filePath;
  }
  const noExt = rel.replace(/\.(mdx?|MDX?)$/, '');
  return noExt.replace(/[\\/]+/g, '-').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
}

function detectTag(language: string, code: string): string {
  const snippet = code.slice(0, 2000);
  if (language === 'bash') return 'shell';
  if (language === 'sql') return 'sql';
  if (language === 'xml') return 'xml';
  if (language === 'json') return 'json';
  if (language === 'yaml') return 'yaml';
  if (language === 'ini') return 'ini';
  if (language === 'markdown') return 'markdown';
  if (/[├└]──|\b(src|assets|public|dist|node_modules)\/.*/.test(snippet)) return 'file-tree';
  if (language === 'typescript' || language === 'javascript') return 'code-snippet';
  return 'text';
}
type TagConfig = {
  icon?: string | false;
  lines?: boolean;
  wrap?: boolean;
  title?: string;
  expandable?: boolean;
  expandableMinLines?: number;
  extra?: string[];
};
type Config = {
  tags?: Record<string, TagConfig>;
};
function loadConfig(cwd: string): Config {
  const p = join(cwd, 'code-blocks.config.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Config;
  } catch {
    return {};
  }
}

function getMetaValue(tokens: string[], key: string): string | undefined {
  const rx = new RegExp(`^${key}=(?:"([^"]*)"|'([^']*)'|(.+))$`);
  for (const t of tokens) {
    const m = t.match(rx);
    if (m) return (m[1] ?? m[2] ?? m[3])?.trim();
  }
  return undefined;
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
    /^\s*(mkdir|cd|ls|cat|touch|echo|rm|cp|mv|npm|yarn|bun|git|npx|chmod|chown|ts-node)\b/,
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

function processFile(filePath: string, config: any = {}): { updated: boolean; before: string; after: string } {
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

    // Enrich meta options per Mintlify guidelines
    // - Add lines (show line numbers) if missing
    // - Add expandable for long code blocks
    // - Set icon to a Font Awesome icon matching the language
    let workingMetaTokens = [...metaTokens];
    const hasLines = workingMetaTokens.some(t => t === 'lines' || t.startsWith('lines='));
    const hasExpandable = workingMetaTokens.some(t => t === 'expandable' || t.startsWith('expandable='));
    const iconIndex = workingMetaTokens.findIndex(t => /^icon=/.test(t));
    const idIndex = workingMetaTokens.findIndex(t => /^id=/.test(t));
    const tagIndex = workingMetaTokens.findIndex(t => /^tag=/.test(t));

    const detectedTag = detectTag(finalLanguage, codeBody);
    const existingTagValue = getMetaValue(metaTokens, 'tag');
    const effectiveTag = existingTagValue ?? detectedTag;
    const tagConfig = (config.tags && config.tags[effectiveTag]) || undefined;
    const codeLineCount = codeBody === '' ? 0 : codeBody.split(/\r?\n/).length;
    const LONG_BLOCK_THRESHOLD = (tagConfig && tagConfig.expandableMinLines) ?? 40;

    if (tagConfig && tagConfig.lines === false) {
      workingMetaTokens = workingMetaTokens.filter(t => t !== 'lines' && !t.startsWith('lines='));
    } else if (!hasLines || (tagConfig && tagConfig.lines === true)) {
      if (!hasLines) workingMetaTokens.push('lines');
    }
    if ((tagConfig && tagConfig.expandable === true) || (!hasExpandable && codeLineCount >= LONG_BLOCK_THRESHOLD)) {
      if (!hasExpandable) workingMetaTokens.push('expandable');
    }
    if (tagConfig && tagConfig.wrap) workingMetaTokens.push('wrap');
    const iconDisabled = tagConfig && tagConfig.icon === false;
    if (iconDisabled) {
      if (iconIndex >= 0) workingMetaTokens.splice(iconIndex, 1);
    } else {
      const iconName = (tagConfig && typeof tagConfig.icon === 'string' ? tagConfig.icon : undefined) || getIconNameForLanguage(finalLanguage);
      if (iconIndex >= 0) {
        workingMetaTokens[iconIndex] = `icon="${iconName}"`;
      } else {
        workingMetaTokens.push(`icon="${iconName}"`);
      }
    }

    if (tagConfig && tagConfig.title) {
      const titleIndex = workingMetaTokens.findIndex(t => /^title=/.test(t));
      const titleToken = `title="${tagConfig.title}"`;
      if (titleIndex >= 0) workingMetaTokens[titleIndex] = titleToken; else workingMetaTokens.push(titleToken);
    }
    if (tagConfig && Array.isArray(tagConfig.extra) && tagConfig.extra.length > 0) {
      workingMetaTokens.push(...tagConfig.extra);
    }

    // Add id and tag for centralized configuration
    const pageSlug = buildPageSlug(filePath);
    const hash = createShortHash(codeBody);
    const blockId = `${pageSlug}__${hash}`;
    const tag = effectiveTag;
    if (idIndex >= 0) {
      workingMetaTokens[idIndex] = `id="${blockId}"`;
    } else {
      workingMetaTokens.push(`id="${blockId}"`);
    }
    if (tagIndex < 0) {
      workingMetaTokens.push(`tag="${tag}"`);
    }

    // De-duplicate meta tokens by key, keeping the last occurrence
    const keys = workingMetaTokens.map(t => t.split('=')[0]);
    let enrichedMetaTokens = workingMetaTokens.filter((t, idx) => keys.lastIndexOf(t.split('=')[0]) === idx);
    // Final enforcement: if config disables lines, ensure it's removed even after de-dup
    if (tagConfig && tagConfig.lines === false) {
      enrichedMetaTokens = enrichedMetaTokens.filter(t => t !== 'lines' && !t.startsWith('lines='));
    }
    const metaChanged = enrichedMetaTokens.join(' ') !== metaTokens.join(' ');
    if (needsHeaderUpdate || metaChanged) changed = true;

    const newHeader = `${fence}${finalLanguage ? ' ' + finalLanguage : ''}${enrichedMetaTokens.length ? ' ' + enrichedMetaTokens.join(' ') : ''}`;

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
  const config = loadConfig(process.cwd());
  const targets = [OFFICIAL_DIR, COMMUNITY_DIR];
  let filesProcessed = 0;
  let filesChanged = 0;
  for (const base of targets) {
    const files = walkDir(base);
    for (const file of files) {
      const { updated } = processFile(file, config);
      filesProcessed += 1;
      if (updated) filesChanged += 1;
    }
  }
  console.log(`Code fences normalized. Files processed: ${filesProcessed}. Files changed: ${filesChanged}.`);
}

main();

