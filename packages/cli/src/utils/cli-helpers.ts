import * as path from 'node:path';
import * as fssync from 'node:fs';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { parse } from 'jsonc-parser';

/**
 * Resolve the project root by walking up from a starting directory until a workspace marker is found.
 * Current marker: presence of `pnpm-workspace.yaml` at some ancestor.
 */
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

/** Expand tilde (~) to the user's home directory if present. */
export function expandPath(filePath: string): string {
  if (filePath && filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/** Find CLI config by checking a few prioritized locations. */
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

export interface ResolvedRootOptions {
  projectRoot: string;
  profile: string;
  flagsRoot?: string;
  flagsConfig?: string;
}

/**
 * Resolve the XML root directory based on precedence:
 * 1) --root flag (if provided)
 * 2) unzip.extract_path from config for the selected profile
 */
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
  }

  return '';
}

/** Compute the default output directory for a given seed, unless overridden. */
export function resolveOutDir(projectRoot: string, seed: string, outDirArg?: string): string {
  const defaultOut = path.join(projectRoot, 'out', seed.replace(/[^A-Za-z0-9_\-:.]/g, '_'));
  return path.resolve(projectRoot, outDirArg ? expandPath(outDirArg) : defaultOut);
}


