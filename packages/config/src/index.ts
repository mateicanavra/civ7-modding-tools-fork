import * as path from 'node:path';
import * as os from 'node:os';
import * as fssync from 'node:fs';
import { promises as fs } from 'node:fs';
import { parse } from 'jsonc-parser';

export const DEFAULT_OUTPUT_BASE_DIR = '.civ7/outputs';
export const DEFAULT_ZIP_DIR = 'archives';
export const DEFAULT_UNZIP_DIR = 'resources';
export const DEFAULT_GRAPH_DIR = 'graph';
export const DEFAULT_ARCHIVE_NAME = 'civ7-official-resources.zip';
export const DEFAULT_INSTALL_DIR_DARWIN =
  "~/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/CivilizationVII.app/Contents/Resources";
export const DEFAULT_INSTALL_DIR_WIN32 =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VII\\Base";

export function expandPath(filePath: string): string {
  if (filePath && filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

function dirIsWorkspaceRoot(dir: string): boolean {
  // Workspace root = nearest package.json declaring workspaces.
  const pkgPath = path.join(dir, 'package.json');
  if (fssync.existsSync(pkgPath)) {
    try {
      const raw = fssync.readFileSync(pkgPath, 'utf8');
      const parsed = JSON.parse(raw) as { workspaces?: unknown };
      if (parsed && typeof parsed === 'object' && 'workspaces' in parsed) return true;
    } catch {
      // Ignore invalid JSON; fall back to other markers.
    }
  }

  return false;
}

export function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    if (dirIsWorkspaceRoot(currentDir)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find project root. Are you in the monorepo?');
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

function getProfile(cfg: Record<string, any>, profileName?: string) {
  if (!profileName) return {};
  return cfg.profiles?.[profileName] ?? {};
}

export function resolveInstallDir(cfg: Record<string, any>, installFlag?: string): string {
  if (installFlag) return expandPath(installFlag);
  if (cfg.inputs?.installDir) return expandPath(cfg.inputs.installDir);
  if (cfg.src_path) return expandPath(cfg.src_path);
  const platform = os.platform();
  if (platform === 'darwin') return expandPath(DEFAULT_INSTALL_DIR_DARWIN);
  if (platform === 'win32') return DEFAULT_INSTALL_DIR_WIN32;
  return '';
}

export interface OutputResolverOptions {
  projectRoot: string;
  profile?: string;
  flagsConfig?: string;
}

export function resolveZipPath(opts: OutputResolverOptions, cfg: Record<string, any>, zipArg?: string): string {
  const { projectRoot, profile = 'default' } = opts;
  if (zipArg) return path.resolve(projectRoot, expandPath(zipArg));
  const profileCfg = getProfile(cfg, profile);
  const profileOutputs = profileCfg.outputs ?? {};
  const globalOutputs = cfg.outputs ?? {};
  const baseDir = profileOutputs.baseDir ?? globalOutputs.baseDir ?? DEFAULT_OUTPUT_BASE_DIR;
  const zipDir = profileOutputs.zip?.dir ?? globalOutputs.zip?.dir ?? DEFAULT_ZIP_DIR;
  const archiveName = profileOutputs.zip?.name ?? globalOutputs.zip?.name ?? DEFAULT_ARCHIVE_NAME;
  return path.resolve(projectRoot, expandPath(path.join(baseDir, zipDir, archiveName)));
}

export function resolveUnzipDir(opts: OutputResolverOptions, cfg: Record<string, any>, extractArg?: string): string {
  const { projectRoot, profile = 'default' } = opts;
  if (extractArg) return path.resolve(projectRoot, expandPath(extractArg));
  const profileCfg = getProfile(cfg, profile);
  const profileOutputs = profileCfg.outputs ?? {};
  const globalOutputs = cfg.outputs ?? {};
  const baseDir = profileOutputs.baseDir ?? globalOutputs.baseDir ?? DEFAULT_OUTPUT_BASE_DIR;
  const unzipDir = profileOutputs.unzip?.dir ?? globalOutputs.unzip?.dir ?? DEFAULT_UNZIP_DIR;
  return path.resolve(projectRoot, expandPath(path.join(baseDir, unzipDir)));
}

export function resolveGraphOutDir(opts: OutputResolverOptions, cfg: Record<string, any>, seed: string, outArg?: string): string {
  const { projectRoot, profile = 'default' } = opts;
  if (outArg) return path.resolve(projectRoot, expandPath(outArg));
  const profileCfg = getProfile(cfg, profile);
  const profileOutputs = profileCfg.outputs ?? {};
  const globalOutputs = cfg.outputs ?? {};
  const baseDir = profileOutputs.baseDir ?? globalOutputs.baseDir ?? DEFAULT_OUTPUT_BASE_DIR;
  const graphDir = profileOutputs.graph?.dir ?? globalOutputs.graph?.dir ?? DEFAULT_GRAPH_DIR;
  const safeSeed = seed.replace(/[^A-Za-z0-9_\-:.]/g, '_');
  return path.resolve(projectRoot, expandPath(path.join(baseDir, graphDir, safeSeed)));
}
