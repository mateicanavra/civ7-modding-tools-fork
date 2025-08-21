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
  execGit,
  listRemoteBranches,
} from "@civ7/plugin-git";

function formatSubtreeHelpMessage(originalMessage?: string): string {
  const base = originalMessage && originalMessage.trim().length > 0 ? originalMessage.trim() : "git-subtree is not available";
  const isMac = process.platform === "darwin";
  const isLinux = process.platform === "linux";
  const helpLines = [
    "git-subtree is required to use mod linking (import/push/pull).",
    isMac
      ? "macOS: Install Homebrew Git and ensure it is first in PATH:\n  brew install git\n  which git\n  git --version\n  git subtree -h"
      : isLinux
      ? "Linux: Install the git-subtree package (or ensure git includes subtree):\n  Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y git-subtree\n  Fedora: sudo dnf install -y git-subtree\n  Arch: sudo pacman -S git\n  Then: git subtree -h"
      : "Install Git with subtree support and ensure 'git subtree -h' works in your shell.",
    "If multiple Git installations exist, ensure the one with subtree appears first in PATH.",
  ];
  return `${base}.\n\n${helpLines.join("\n")}`;
}

async function ensureSubtreeAvailableOrThrow(verbose: boolean): Promise<void> {
  try {
    await assertSubtreeReady({ verbose });
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : undefined;
    throw new Error(formatSubtreeHelpMessage(msg));
  }
}

async function saveModLinkMeta(slug: string, remoteName: string, branch: string, verbose: boolean): Promise<void> {
  // Store under local git config.
  await execGit(['config', '--local', `civ7.mod.${slug}.remote`, remoteName], { verbose });
  await execGit(['config', '--local', `civ7.mod.${slug}.branch`, branch], { verbose });
}

async function readModLinkMeta(slug: string, verbose: boolean): Promise<{ remote: string | null; branch: string | null }> {
  const r = await execGit(['config', '--local', '--get', `civ7.mod.${slug}.remote`], { verbose, allowNonZeroExit: true });
  const b = await execGit(['config', '--local', '--get', `civ7.mod.${slug}.branch`], { verbose, allowNonZeroExit: true });
  const remote = r.code === 0 ? r.stdout.trim() || null : null;
  const branch = b.code === 0 ? b.stdout.trim() || null : null;
  return { remote, branch };
}

/**
 * Information about the OS-specific Civilization VII Mods directory
 * (the in-game install location, not the monorepo 'mods/' folder).
 */
export interface ModsDirInfo {
  platform: NodeJS.Platform;
  modsDir: string;
}

/**
 * Return the OS-specific Mods directory info for the local machine.
 * This is separate from the monorepo 'mods/' folder used for sources.
 */
export function resolveModsDir(): ModsDirInfo {
  return resolveModsDirFs();
}

/**
 * List child directories inside the given Mods directory path.
 * Defaults to the OS-specific Mods directory if not provided.
 */
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
 * High-level status for a specific mod subtree and its remote, including repo-level info.
 */
export async function getModStatus(params: {
  slug?: string;
  remoteName?: string;
  branch?: string;
  verbose?: boolean;
}): Promise<{
  // Repo-level
  repoRoot: string | null;
  shallow: boolean;
  clean: boolean;
  hasSubtree: boolean;
  remotes: Array<{ name: string; url: string | null }>;
  // Mod-level (may be null if no slug provided)
  modsPrefix: string | null;
  modsPathExists: boolean;
  subtreeExists: boolean;
  remoteConfigured: boolean;
  remoteUrl: string | null;
  branch: string;
}> {
  const { slug, remoteName, branch = "main", verbose = false } = params;
  const snapshot = await getStatusSnapshot({ verbose });
  const prefix = slug ? path.posix.join("mods", slug) : null;
  const abs = snapshot.repoRoot && prefix ? path.join(snapshot.repoRoot, prefix) : null;

  let remoteConfigured = false;
  let remoteUrl: string | null = null;
  if (remoteName) {
    remoteUrl = await getRemoteUrl(remoteName, { verbose });
    remoteConfigured = !!remoteUrl;
  }

  return {
    repoRoot: snapshot.repoRoot,
    shallow: !!snapshot.shallow,
    clean: !!snapshot.clean,
    hasSubtree: !!snapshot.hasSubtree,
    remotes: snapshot.remotes ?? [],
    modsPrefix: prefix,
    modsPathExists: !!snapshot.repoRoot && fs.existsSync(path.join(snapshot.repoRoot, "mods")),
    subtreeExists: !!snapshot.repoRoot && !!abs && fs.existsSync(abs),
    remoteConfigured,
    remoteUrl,
    branch,
  };
}

/**
 * Configure or update a mod mirror remote and fetch tags.
 * Returns whether the remote was added/updated/unchanged.
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

/**
 * Deploy a built mod from a local folder to the user's OS Mods directory.
 * This copies the exact contents of inputDir into Mods/<modId>.
 */
export interface DeployOptions {
  inputDir: string;
  modId: string;
  modsDir?: string;
}
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

/**
 * Import a mod repository into the monorepo as a subtree at mods/<slug>.
 * Optionally configure the remote if it doesn't exist.
 */
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

  await ensureSubtreeAvailableOrThrow(verbose);

  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");

  // Ensure monorepo mods dir exists
  const modsDir = path.join(root, "mods");
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

  const prefix = path.posix.join("mods", slug);

  if (!allowDirty) {
    const clean = await isWorktreeClean({ verbose });
    if (!clean) throw new Error("Working tree is not clean. Commit/stash or set allowDirty=true.");
  }

  // Ensure remote is configured; create/update if URL provided
  const exists = await remoteExists(remoteName, { verbose });
  if (!exists && !remoteUrl) {
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

/**
 * Push a subtree at mods/<slug> out to its mirror remote.
 */
export interface PushModOptions {
  slug: string;
  remoteName: string;
  branch?: string;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}
export async function pushModToRemote(opts: PushModOptions): Promise<void> {
  let {
    slug,
    remoteName,
    branch,
    verbose = false,
    allowDirty = false,
    autoUnshallow = false,
  } = opts;

  await ensureSubtreeAvailableOrThrow(verbose);

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

  // Resolve branch from stored meta if not provided
  if (!branch) {
    const meta = await readModLinkMeta(slug, verbose);
    branch = meta.branch ?? undefined;
    if (!remoteName && meta.remote) remoteName = meta.remote; // keep provided remoteName priority
  }

  await fetchRemote(remoteName, { tags: true }, { verbose });
  if (autoUnshallow) {
    await assertFullHistory(remoteName, { verbose });
  }

  if (!branch) {
    const branches = await listRemoteBranches(remoteName, { verbose });
    const hint = branches.length ? `\nAvailable branches on ${remoteName}:\n- ${branches.join('\n- ')}` : '';
    throw new Error(
      `No branch provided for push and none stored from setup for slug "${slug}". ` +
        `Pass --branch <name> or run setup again to persist it.${hint}`,
    );
  }

  await subtreePush(prefix, remoteName, branch, { verbose });
}

/**
 * Pull updates from the mirror remote into the subtree at mods/<slug>.
 */
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
  let {
    slug,
    remoteName,
    branch,
    squash = false,
    verbose = false,
    allowDirty = false,
    autoUnshallow = false,
  } = opts;

  await ensureSubtreeAvailableOrThrow(verbose);

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

  // Resolve branch from stored meta if not provided
  if (!branch) {
    const meta = await readModLinkMeta(slug, verbose);
    branch = meta.branch ?? undefined;
    if (!remoteName && meta.remote) remoteName = meta.remote; // keep provided remoteName priority
  }

  await fetchRemote(remoteName, { tags: true }, { verbose });
  if (autoUnshallow) {
    await assertFullHistory(remoteName, { verbose });
  }

  if (!branch) {
    const branches = await listRemoteBranches(remoteName, { verbose });
    const hint = branches.length ? `\nAvailable branches on ${remoteName}:\n- ${branches.join('\n- ')}` : '';
    throw new Error(
      `No branch provided for pull and none stored from setup for slug "${slug}". ` +
        `Pass --branch <name> or run setup again to persist it.${hint}`,
    );
  }

  await subtreePull(prefix, remoteName, branch, { squash }, { verbose });
}

/**
 * Link a mod by configuring the remote and importing the subtree in one step.
 * Sensible defaults: branch=main, squash=false, autoUnshallow=true, remoteName=mod-<slug>, slug derived from repo name if not provided.
 */
export interface LinkModOptions {
  remoteUrl: string;
  branch?: string;
  slug?: string;
  remoteName?: string;
  squash?: boolean;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}

function inferSlugFromRemoteUrl(remoteUrl: string): string {
  // Handle common git URL formats: git@host:owner/repo.git, https://host/owner/repo.git, file paths
  const sanitized = remoteUrl.replace(/\\+/g, "/");
  const parts = sanitized
    .replace(/^git@[^:]+:/, "")
    .replace(/^https?:\/\//, "")
    .split("/");
  const last = parts[parts.length - 1] || "mod";
  const base = last.replace(/\.git$/i, "");
  const kebab = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return kebab || "mod";
}

export async function link(opts: LinkModOptions): Promise<{ slug: string; remoteName: string; branch: string; prefix: string }> {
  const {
    remoteUrl,
    branch = "main",
    verbose = false,
    squash = false,
    allowDirty = false,
  } = opts;
  if (!remoteUrl) throw new Error("remoteUrl is required for link");

  const slug = opts.slug ?? inferSlugFromRemoteUrl(remoteUrl);
  const remoteName = opts.remoteName ?? `mod-${slug}`;
  const autoUnshallow = opts.autoUnshallow ?? true; // default to full history

  await configureModRemote({ remoteName, remoteUrl, verbose });
  await importModFromRemote({
    slug,
    remoteName,
    remoteUrl,
    branch,
    squash,
    verbose,
    allowDirty,
    autoUnshallow,
  });

  // Persist meta for downstream push/pull
  await saveModLinkMeta(slug, remoteName, branch, verbose);

  const prefix = path.posix.join("mods", slug);
  return { slug, remoteName, branch, prefix };
}

/**
 * Optional: plan and validation helpers for future flows.
 */

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
  const { modId } = options;
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
export function validateModStructure(_modDir: string): ValidateResult {
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

/**
 * Default export convenience.
 */
export default {
  resolveModsDir,
  listMods,
  ensureModsFolder,
  getModStatus,
  configureModRemote,
  deployMod,
  importModFromRemote,
  pushModToRemote,
  pullModFromRemote,
  link,
  planCreateMod,
  validateModStructure,
  planPackageMod,
  planSteamUpload,
};
