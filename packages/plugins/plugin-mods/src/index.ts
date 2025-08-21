import * as path from "node:path";
import * as fs from "node:fs";
import {
  copyDirectoryRecursive,
  ensureDirectory,
  resolveModsDir as resolveModsDirFs,
} from "@civ7/plugin-files";
import {
  assertSubtreeReady,
  addOrUpdateRemote,
  fetchRemote,
  getRemoteUrl,
  remoteExists,
  subtreeAdd,
  subtreePush,
  subtreePull,
  assertFullHistory,
  isWorktreeClean,
  getRepoRoot,
  getStatusSnapshot,
} from "@civ7/plugin-git";

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
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * Ensure the monorepo-level "mods" directory exists and return absolute paths.
 */
export async function ensureModsFolder(): Promise<{ repoRoot: string; modsDir: string }> {
  const root = await getRepoRoot({ allowNonZeroExit: true });
  if (!root) throw new Error("Not inside a git repository.");
  const modsDir = path.join(root, "mods");
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
  return { repoRoot: root, modsDir };
}

/**
 * High-level status for a specific mod subtree and its remote.
 */
export async function getModStatus(params: {
  slug: string;
  remoteName?: string;
  branch?: string;
  verbose?: boolean;
}): Promise<{
  repoRoot: string | null;
  modsPrefix: string;
  modsPathExists: boolean;
  subtreeExists: boolean;
  remoteConfigured: boolean;
  remoteUrl: string | null;
  branch: string;
}> {
  const { slug, remoteName, branch = "main", verbose = false } = params;
  const snapshot = await getStatusSnapshot({ verbose });
  const prefix = path.posix.join("mods", slug);
  const abs = snapshot.repoRoot ? path.join(snapshot.repoRoot, prefix) : prefix;

  let remoteConfigured = false;
  let remoteUrl: string | null = null;
  if (remoteName) {
    remoteUrl = await getRemoteUrl(remoteName, { verbose });
    remoteConfigured = !!remoteUrl;
  }

  return {
    repoRoot: snapshot.repoRoot,
    modsPrefix: prefix,
    modsPathExists: !!snapshot.repoRoot && fs.existsSync(path.join(snapshot.repoRoot, "mods")),
    subtreeExists: !!snapshot.repoRoot && fs.existsSync(abs),
    remoteConfigured,
    remoteUrl,
    branch,
  };
}

/**
 * Configure or update a mod remote and fetch tags.
 */
export async function configureModRemote(options: {
  remoteName: string;
  remoteUrl: string;
  verbose?: boolean;
}): Promise<"added" | "updated" | "unchanged"> {
  const { remoteName, remoteUrl, verbose = false } = options;
  const res = await addOrUpdateRemote(remoteName, remoteUrl, { verbose });
  await fetchRemote(remoteName, { tags: true }, { verbose });
  return res;
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

export interface ImportModOptions {
  slug: string;
  remoteName: string;
  remoteUrl?: string;
  branch?: string;
  squash?: boolean;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}

export async function importModFromRemote(opts: ImportModOptions): Promise<void> {
  const {
    slug,
    remoteName,
    remoteUrl,
    branch = "main",
    squash = false,
    verbose = false,
    allowDirty = false,
    autoUnshallow = false,
  } = opts;

  await assertSubtreeReady({ verbose });

  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");

  const modsDirPath = path.join(root, "mods");
  if (!fs.existsSync(modsDirPath)) fs.mkdirSync(modsDirPath, { recursive: true });

  const prefix = path.posix.join("mods", slug);

  if (!allowDirty) {
    const clean = await isWorktreeClean({ verbose });
    if (!clean) throw new Error("Working tree is not clean. Commit/stash or set allowDirty=true.");
  }

  if (!(await remoteExists(remoteName, { verbose }))) {
    if (!remoteUrl)
      throw new Error("Remote not configured. Provide remoteUrl to create/update it.");
  }
  if (remoteUrl) {
    await addOrUpdateRemote(remoteName, remoteUrl, { verbose });
  }
  await fetchRemote(remoteName, { tags: true }, { verbose });

  if (autoUnshallow) {
    await assertFullHistory(remoteName, { verbose });
  }

  await subtreeAdd(prefix, remoteName, branch, { squash }, { verbose });
}

export interface PushModOptions {
  slug: string;
  remoteName: string;
  branch?: string;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}

export async function pushModToRemote(opts: PushModOptions): Promise<void> {
  const {
    slug,
    remoteName,
    branch = "main",
    verbose = false,
    allowDirty = false,
    autoUnshallow = false,
  } = opts;

  await assertSubtreeReady({ verbose });

  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");

  const prefix = path.posix.join("mods", slug);
  if (!fs.existsSync(path.join(root, prefix))) {
    throw new Error(`Subtree directory "${prefix}" does not exist.`);
  }

  if (!allowDirty) {
    const clean = await isWorktreeClean({ verbose });
    if (!clean) throw new Error("Working tree is not clean. Commit/stash or set allowDirty=true.");
  }

  await fetchRemote(remoteName, { tags: true }, { verbose });
  if (autoUnshallow) {
    await assertFullHistory(remoteName, { verbose });
  }

  await subtreePush(prefix, remoteName, branch, { verbose });
}

export interface PullModOptions {
  slug: string;
  remoteName: string;
  branch?: string;
  squash?: boolean;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}

export async function pullModFromRemote(opts: PullModOptions): Promise<void> {
  const {
    slug,
    remoteName,
    branch = "main",
    squash = false,
    verbose = false,
    allowDirty = false,
    autoUnshallow = false,
  } = opts;

  await assertSubtreeReady({ verbose });

  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");

  const prefix = path.posix.join("mods", slug);
  if (!fs.existsSync(path.join(root, prefix))) {
    throw new Error(`Subtree directory "${prefix}" does not exist.`);
  }

  if (!allowDirty) {
    const clean = await isWorktreeClean({ verbose });
    if (!clean) throw new Error("Working tree is not clean. Commit/stash or set allowDirty=true.");
  }

  await fetchRemote(remoteName, { tags: true }, { verbose });
  if (autoUnshallow) {
    await assertFullHistory(remoteName, { verbose });
  }

  await subtreePull(prefix, remoteName, branch, { squash }, { verbose });
}

export default {
  resolveModsDir,
  listMods,
  deployMod,
  importModFromRemote,
  pushModToRemote,
  pullModFromRemote,
};

// --- Future stubs ---
export interface CreateModOptions {
  modId: string;
  name?: string;
  description?: string;
  authors?: string;
}

export interface CreateModPlan {
  files: Array<{ path: string; description: string }>;
}

export function planCreateMod(options: CreateModOptions): CreateModPlan {
  const { modId, name, description, authors } = options;
  // Use examples at plugin-mapgen/src/config/config.xml and epic-diverse-huge-map.modinfo for structure
  return {
    files: [
      {
        path: `${modId}/${modId}.modinfo`,
        description: "Mod descriptor with Properties, Dependencies, ActionGroups, LocalizedText",
      },
      { path: `${modId}/config/config.xml`, description: "Core config: Database > Maps > Rows" },
      {
        path: `${modId}/text/en_us/MapText.xml`,
        description: "Localization stub for names/descriptions",
      },
    ],
  };
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
}
export function validateModStructure(modDir: string): ValidateResult {
  // Stub: later will check required files, XML schema, etc.
  return { valid: true, errors: [] };
}

export interface PackagePlan {
  archivePath: string;
}
export function planPackageMod(modDir: string, outZip?: string): PackagePlan {
  // Stub: later integrate with zip in plugin-files
  const archivePath = outZip ?? `${modDir}.zip`;
  return { archivePath };
}

export interface SteamUploadPlan {
  notes: string;
}
export function planSteamUpload(archivePath: string): SteamUploadPlan {
  // Stub: will integrate with Steam APIs later
  return { notes: `Upload ${archivePath} to Steam Workshop (stub)` };
}
