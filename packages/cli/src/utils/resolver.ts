import * as path from 'node:path';
import * as os from 'node:os';
import * as fssync from 'node:fs';
import { promises as fs } from 'node:fs';
import { parse } from 'jsonc-parser';
// Unified resolver: input + output helpers live here

// ===== Defaults (single source of truth) =====
export const DEFAULT_OUTPUT_BASE = '.civ7/outputs';
export const DEFAULT_TMP_BASE = '.civ7/tmp';
export const DEFAULT_ZIP_DIR = 'archives';
export const DEFAULT_UNZIP_DIR = 'resources';
export const DEFAULT_GRAPH_DIR = 'graph';
export const DEFAULT_ARCHIVE_NAME = 'civ7-official-resources.zip';
export const DEFAULT_INSTALL_DIR_DARWIN =
  "~/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/CivilizationVII.app/Contents/Resources";
export const DEFAULT_INSTALL_DIR_WIN32 =
  "C\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VII\\Base";

export function expandPath(filePath: string): string {
  if (filePath && filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

export function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    if (fssync.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find project root. Are you in a pnpm workspace?');
}

export function findConfig(projectRoot: string, configFlag?: string): string | null {
  const searchPaths = new Set<string | undefined>([
    configFlag,
    path.join(process.cwd(), 'civ.config.jsonc'),
    path.join(projectRoot, 'civ.config.jsonc'),
  ]);
  for (const p of searchPaths) {
    if (p && fssync.existsSync(p)) return p;
  }
  return null;
}

export interface OutputResolverOptions {
  projectRoot: string;
  profile?: string;
  flagsConfig?: string;
}

export interface ResolvedConfig {
  raw: Record<string, any>;
  path: string | null;
}

export async function loadConfig(projectRoot: string, configFlag?: string): Promise<ResolvedConfig> {
  const p = findConfig(projectRoot, configFlag);
  if (p) {
    const raw = await fs.readFile(p, 'utf8');
    return { raw: parse(raw) as Record<string, any>, path: p };
  }
  return { raw: {}, path: null };
}

function getOutputBase(cfg: Record<string, any>): string {
  const base = cfg.outputDirs?.base ?? DEFAULT_OUTPUT_BASE;
  return base;
}

function getTmpBase(cfg: Record<string, any>): string {
  const tmp = cfg.outputDirs?.tmp ?? DEFAULT_TMP_BASE;
  return tmp;
}

export interface ZipResolution {
  zipPath: string; // absolute
  srcDir?: string; // optional, may be undefined if not resolvable
}

export function resolveZipPath(opts: OutputResolverOptions, cfg: Record<string, any>, zipArg?: string): string {
  const { projectRoot, profile = 'default' } = opts;
  if (zipArg) return path.resolve(projectRoot, expandPath(zipArg));
  const profileCfg = cfg[profile] ?? {};
  const zipPathFromProfile = profileCfg.zip?.zip_path as string | undefined;
  if (zipPathFromProfile) return path.resolve(projectRoot, expandPath(zipPathFromProfile));
  const base = getOutputBase(cfg);
  const zipDir = cfg.outputDirs?.zip ?? DEFAULT_ZIP_DIR;
  const archiveName = cfg.resources?.archiveName ?? DEFAULT_ARCHIVE_NAME;
  return path.resolve(projectRoot, expandPath(path.join(base, zipDir, archiveName)));
}

export function resolveUnzipDir(opts: OutputResolverOptions, cfg: Record<string, any>, extractArg?: string): string {
  const { projectRoot, profile = 'default' } = opts;
  if (extractArg) return path.resolve(projectRoot, expandPath(extractArg));
  const profileCfg = cfg[profile] ?? {};
  const extractFromProfile = profileCfg.unzip?.extract_path as string | undefined;
  if (extractFromProfile) return path.resolve(projectRoot, expandPath(extractFromProfile));
  const base = getOutputBase(cfg);
  const unzipDir = cfg.outputDirs?.unzip ?? DEFAULT_UNZIP_DIR;
  return path.resolve(projectRoot, expandPath(path.join(base, unzipDir)));
}

export function resolveGraphOutDir(opts: OutputResolverOptions, cfg: Record<string, any>, seed: string, outArg?: string): string {
  const { projectRoot } = opts;
  if (outArg) return path.resolve(projectRoot, expandPath(outArg));
  const base = getOutputBase(cfg);
  const graphDir = cfg.outputDirs?.graph ?? DEFAULT_GRAPH_DIR;
  const safeSeed = seed.replace(/[^A-Za-z0-9_\-:.]/g, '_');
  return path.resolve(projectRoot, expandPath(path.join(base, graphDir, safeSeed)));
}

export function resolveInstallDir(cfg: Record<string, any>, installFlag?: string): string {
  if (installFlag) return expandPath(installFlag);
  if (cfg.resources?.installDir) return expandPath(cfg.resources.installDir);
  if (cfg.src_path) return expandPath(cfg.src_path); // legacy key support
  const platform = os.platform();
  if (platform === 'darwin') {
    return expandPath(DEFAULT_INSTALL_DIR_DARWIN);
  } else if (platform === 'win32') {
    return DEFAULT_INSTALL_DIR_WIN32;
  }
  return '';
}

export interface ResolvedRootOptions {
  projectRoot: string;
  profile: string;
  flagsRoot?: string;
  flagsConfig?: string;
}

export async function resolveRootFromConfigOrFlag(opts: ResolvedRootOptions): Promise<string> {
  const { projectRoot, profile, flagsRoot, flagsConfig } = opts;
  if (flagsRoot) {
    return path.resolve(projectRoot, expandPath(flagsRoot));
  }
  const configPath = findConfig(projectRoot, flagsConfig);
  if (configPath) {
    const raw = await fs.readFile(configPath, 'utf8');
    const cfg: Record<string, any> = parse(raw);
    const profileCfg = cfg[profile];
    if (profileCfg?.unzip?.extract_path) {
      return path.resolve(projectRoot, expandPath(profileCfg.unzip.extract_path));
    }
    // Fallback to outputDirs.unzip under outputDirs.base if provided
    const base = cfg.outputDirs?.base ?? DEFAULT_OUTPUT_BASE;
    const unzipDir = cfg.outputDirs?.unzip ?? DEFAULT_UNZIP_DIR;
    if (base || unzipDir) {
      return path.resolve(projectRoot, expandPath(path.join(base, unzipDir)));
    }
  }
  return '';
}

/*
====================
Proposed Test Cases
====================

Unit tests (resolver)
1) loadConfig
   - finds config at cwd and returns { raw, path }
   - finds config at projectRoot
   - returns { raw: {}, path: null } when missing

2) findProjectRoot
   - returns root containing pnpm-workspace.yaml for nested start path
   - throws when no workspace marker up to FS root

3) resolveInstallDir
   - uses installFlag when provided
   - uses cfg.resources.installDir
   - uses legacy cfg.src_path
   - defaults to DEFAULT_INSTALL_DIR_DARWIN on darwin
   - defaults to DEFAULT_INSTALL_DIR_WIN32 on win32
   - returns '' on unsupported platforms

4) resolveZipPath
   - uses explicit zipArg
   - uses profile.zip.zip_path
   - defaults to DEFAULT_OUTPUT_BASE/DEFAULT_ZIP_DIR/DEFAULT_ARCHIVE_NAME
   - respects cfg.outputDirs.base override
   - respects cfg.outputDirs.zip override
   - respects cfg.resources.archiveName override

5) resolveUnzipDir
   - uses explicit extractArg
   - uses profile.unzip.extract_path
   - defaults to DEFAULT_OUTPUT_BASE/DEFAULT_UNZIP_DIR
   - respects cfg.outputDirs.base override
   - respects cfg.outputDirs.unzip override

6) resolveGraphOutDir
   - uses outArg when provided
   - defaults to DEFAULT_OUTPUT_BASE/DEFAULT_GRAPH_DIR/<sanitized-seed>
   - respects cfg.outputDirs.base and cfg.outputDirs.graph overrides
   - sanitizes seed (non-alphanumeric -> underscore)

7) resolveRootFromConfigOrFlag
   - uses flagsRoot when provided
   - uses profile.unzip.extract_path from config
   - falls back to DEFAULT_OUTPUT_BASE/DEFAULT_UNZIP_DIR when unzip.extract_path missing
   - returns '' if nothing resolvable

Integration tests (CLI-level behavior)
8) unzip
   - reads civ.config.jsonc profile and extracts to configured path
   - with outputDirs present but unzip.extract_path absent, extracts to DEFAULT_OUTPUT_BASE/DEFAULT_UNZIP_DIR

9) zip
   - reads install dir via flag/resources.installDir/src_path
   - writes archive to DEFAULT_OUTPUT_BASE/DEFAULT_ZIP_DIR/DEFAULT_ARCHIVE_NAME by default

10) explore/crawl
   - resolve root via unzip.extract_path (or fallback via outputDirs)
   - write outputs under DEFAULT_OUTPUT_BASE/DEFAULT_GRAPH_DIR/<seed> by default

Edge
11) expandPath
   - '~' expands to home dir; non-tilde remains unchanged

12) findConfig precedence
   - --config overrides cwd and projectRoot
*/


