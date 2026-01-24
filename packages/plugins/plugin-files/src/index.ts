import * as path from 'node:path';
import * as fsSync from 'node:fs';
import { spawn } from 'node:child_process';
import { loadConfig, resolveInstallDir, resolveUnzipDir, resolveZipPath, findProjectRoot } from '@civ7/config';
import type { Dirent } from 'node:fs';

export interface ZipOptions {
  projectRoot?: string;
  profile?: string;
  srcDir?: string;
  out?: string;
  verbose?: boolean;
  configPath?: string;
}

export interface UnzipOptions {
  projectRoot?: string;
  profile?: string;
  zip?: string;
  dest?: string;
  configPath?: string;
}

export interface OperationSummary {
  archiveSizeBytes: number;
  uncompressedSizeBytes: number;
  outputPath: string;
}

export interface CopySummary {
  copiedFiles: number;
  skippedEntries: number;
  errors: number;
}

export interface DirectoryCopyOptions {
  filter?: (relativePath: string, dirent: Dirent) => boolean;
  preserveSymlinks?: boolean;
  onCopy?: (fromPath: string, toPath: string) => void;
}

function execSpawn(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'pipe' });
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${cmd} exited with code ${code}`));
      resolve();
    });
    p.on('error', (err) => reject(err));
  });
}

async function readUncompressedSize(zipPath: string): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn('unzip', ['-l', zipPath], { stdio: 'pipe' });
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('close', () => {
      const last = out.trim().split('\n').pop() ?? '';
      const size = last ? parseInt(last.trim().split(/\s+/)[0] ?? '0', 10) : 0;
      resolve(Number.isFinite(size) ? size : 0);
    });
    p.on('error', () => resolve(0));
  });
}

function normalizeGitmodulesPath(p: string): string {
  return p.split(path.sep).join('/');
}

function isDestConfiguredAsSubmodule(projectRoot: string, destDir: string): boolean {
  const gitmodulesPath = path.join(projectRoot, '.gitmodules');
  if (!fsSync.existsSync(gitmodulesPath)) return false;

  const rel = normalizeGitmodulesPath(path.relative(projectRoot, destDir));
  if (!rel || rel.startsWith('..')) return false;

  const text = fsSync.readFileSync(gitmodulesPath, 'utf8');
  // Match common .gitmodules formatting: `path = <rel>`
  const re = new RegExp(`^\\s*path\\s*=\\s*${rel.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*$`, 'm');
  return re.test(text);
}

export async function zipResources(options: ZipOptions): Promise<OperationSummary> {
  const projectRoot = options.projectRoot ?? findProjectRoot(process.cwd());
  const cfg = await loadConfig(projectRoot, options.configPath);
  const raw = cfg.raw ?? {};
  const profile = options.profile ?? 'default';

  const srcDir = options.srcDir ?? resolveInstallDir(raw);
  if (!srcDir || !fsSync.existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  const zipPath = options.out ?? resolveZipPath({ projectRoot, profile }, raw);
  const outputDir = path.dirname(zipPath);
  fsSync.mkdirSync(outputDir, { recursive: true });
  if (fsSync.existsSync(zipPath)) fsSync.unlinkSync(zipPath);

  const includePatterns: string[] = raw.profiles?.[profile]?.zip?.include || [];
  const excludePatterns: string[] = raw.profiles?.[profile]?.zip?.exclude || [];

  const args: string[] = ['-r'];
  if (!options.verbose) args.push('-q');
  args.push('-X', zipPath);
  if (includePatterns.length > 0) {
    args.push(...includePatterns);
  } else {
    args.push('.');
    for (const pat of excludePatterns) {
      args.push('-x', pat);
    }
  }

  await execSpawn('zip', args, srcDir);

  const archiveSizeBytes = fsSync.statSync(zipPath).size;
  const uncompressedSizeBytes = await readUncompressedSize(zipPath);
  return { archiveSizeBytes, uncompressedSizeBytes, outputPath: zipPath };
}

export async function unzipResources(options: UnzipOptions): Promise<OperationSummary> {
  const projectRoot = options.projectRoot ?? findProjectRoot(process.cwd());
  const cfg = await loadConfig(projectRoot, options.configPath);
  const raw = cfg.raw ?? {};
  const profile = options.profile ?? 'default';

  const sourceZip = options.zip ?? resolveZipPath({ projectRoot, profile }, raw);
  if (!fsSync.existsSync(sourceZip)) {
    throw new Error(`Source zip not found: ${sourceZip}`);
  }
  const destDir = options.dest ?? resolveUnzipDir({ projectRoot, profile }, raw);
  const destIsSubmodule = isDestConfiguredAsSubmodule(projectRoot, destDir);
  if (destIsSubmodule) {
    const gitMarker = path.join(destDir, '.git');
    if (!fsSync.existsSync(gitMarker)) {
      const rel = normalizeGitmodulesPath(path.relative(projectRoot, destDir));
      throw new Error(
        `Destination is configured as a git submodule (${rel}), but is not initialized. Run 'pnpm resources:init' and retry.`,
      );
    }
    // Preserve the submodule metadata but ensure a "fresh" extract by clearing everything
    // except the `.git` marker (gitdir file or directory).
    fsSync.mkdirSync(destDir, { recursive: true });
    const entries = fsSync.readdirSync(destDir);
    for (const entry of entries) {
      if (entry === '.git') continue;
      fsSync.rmSync(path.join(destDir, entry), { recursive: true, force: true });
    }
  } else {
    if (fsSync.existsSync(destDir)) fsSync.rmSync(destDir, { recursive: true, force: true });
    fsSync.mkdirSync(destDir, { recursive: true });
  }

  await execSpawn('unzip', ['-q', '-o', sourceZip, '-d', destDir]);

  const archiveSizeBytes = fsSync.statSync(sourceZip).size;
  const uncompressedSizeBytes = await readUncompressedSize(sourceZip);
  return { archiveSizeBytes, uncompressedSizeBytes, outputPath: destDir };
}

function ensureDir(dirPath: string): void {
  if (!fsSync.existsSync(dirPath)) {
    fsSync.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureDirectory(pathToEnsure: string): void {
  ensureDir(pathToEnsure);
}

export function copyDirectoryRecursive(sourceDir: string, destDir: string, options?: DirectoryCopyOptions): CopySummary {
  const summary: CopySummary = { copiedFiles: 0, skippedEntries: 0, errors: 0 };
  const root = sourceDir;
  ensureDir(destDir);

  function recurse(currentSrc: string, currentDest: string, relBase: string) {
    const entries = fsSync.readdirSync(currentSrc, { withFileTypes: true });
    for (const entry of entries) {
      const from = path.join(currentSrc, entry.name);
      const to = path.join(currentDest, entry.name);
      const rel = path.join(relBase, entry.name);
      try {
        if (entry.isDirectory()) {
          ensureDir(to);
          recurse(from, to, rel);
          continue;
        }
        if (entry.isSymbolicLink()) {
          if (options?.preserveSymlinks) {
            try {
              const target = fsSync.readlinkSync(from);
              fsSync.symlinkSync(target, to);
              options?.onCopy?.(from, to);
              summary.copiedFiles++;
            } catch (e) {
              summary.errors++;
            }
          } else {
            // Skip symlinks by default
            summary.skippedEntries++;
          }
          continue;
        }
        // Files
        if (options?.filter && !options.filter(rel, entry)) {
          summary.skippedEntries++;
          continue;
        }
        ensureDir(path.dirname(to));
        fsSync.copyFileSync(from, to);
        options?.onCopy?.(from, to);
        summary.copiedFiles++;
      } catch (err) {
        summary.errors++;
      }
    }
  }

  recurse(sourceDir, destDir, '.');
  return summary;
}

/**
 * Resolve the user-writable Civ7 Game Data directory by OS conventions.
 * - macOS: ~/Library/Application Support/Civilization VII
 * - Windows: %USERPROFILE%/Documents/My Games/Sid Meier's Civilization VII
 * - Linux/other: ~/.local/share/civ7
 */
export function resolveGameDataDir(): string {
  const platform = process.platform;
  if (platform === 'darwin') {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(home, 'Library', 'Application Support', 'Civilization VII');
  }
  if (platform === 'win32') {
    const userProfile = process.env.USERPROFILE || '';
    return path.join(userProfile, 'Documents', 'My Games', "Sid Meier's Civilization VII");
  }
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.local', 'share', 'civ7');
}

export interface ModsDirInfo {
  platform: NodeJS.Platform;
  modsDir: string;
}

/**
 * Resolve the Mods directory under the user-writable Game Data folder.
 */
export function resolveModsDir(): ModsDirInfo {
  const base = resolveGameDataDir();
  return { platform: process.platform, modsDir: path.join(base, 'Mods') };
}
