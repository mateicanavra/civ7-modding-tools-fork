import * as path from 'node:path';
import * as fs from 'node:fs';
import { copyDirectoryRecursive, ensureDirectory, resolveModsDir as resolveModsDirFs } from '@civ7/plugin-files';

export interface ModsDirInfo {
  platform: NodeJS.Platform;
  modsDir: string;
}

export interface DeployOptions {
  inputDir: string;
  modId: string;
  modsDir?: string;
}

export function resolveModsDir(): ModsDirInfo {
  return resolveModsDirFs();
}

export function listMods(modsDir?: string): string[] {
  const target = modsDir ?? resolveModsDir().modsDir;
  if (!target || !fs.existsSync(target)) return [];
  const entries = fs.readdirSync(target, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

// copy behavior is unfiltered: deploy what the build produced

export interface DeployResult {
  modsDir: string;
  targetDir: string;
  filesCopied: number;
}

export function deployMod(options: DeployOptions): DeployResult {
  const { inputDir, modId } = options;
  if (!inputDir || !fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }
  if (!modId || !/^[A-Za-z0-9_-]+$/.test(modId)) {
    throw new Error(`Invalid mod id: ${modId}. Use alphanumeric, dash or underscore.`);
  }

  const modsDir = options.modsDir ?? resolveModsDir().modsDir;
  ensureDirectory(modsDir);
  const targetDir = path.join(modsDir, modId);
  ensureDirectory(targetDir);

  const summary = copyDirectoryRecursive(inputDir, targetDir);
  const filesCopied = summary.copiedFiles;

  return { modsDir, targetDir, filesCopied };
}

export default {
  resolveModsDir,
  listMods,
  deployMod,
};


