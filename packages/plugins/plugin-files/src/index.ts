import * as path from 'node:path';
import * as fsSync from 'node:fs';
import { spawn } from 'node:child_process';
import { loadConfig, resolveInstallDir, resolveUnzipDir, resolveZipPath, findProjectRoot } from '@civ7/config';

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
  if (fsSync.existsSync(destDir)) fsSync.rmSync(destDir, { recursive: true, force: true });
  fsSync.mkdirSync(destDir, { recursive: true });

  await execSpawn('unzip', ['-q', sourceZip, '-d', destDir]);

  const archiveSizeBytes = fsSync.statSync(sourceZip).size;
  const uncompressedSizeBytes = await readUncompressedSize(sourceZip);
  return { archiveSizeBytes, uncompressedSizeBytes, outputPath: destDir };
}


