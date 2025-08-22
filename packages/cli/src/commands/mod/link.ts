import { Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  getModStatus,
  link as linkPlugin,
  listRegisteredSlugs,
} from "@civ7/plugin-mods";
import { getRemotePushConfig } from "@civ7/plugin-git";
import {
  configureRemote,
  importSubtree,
  pushSubtree,
  pullSubtree,
  resolveRemoteName,
  requireRemoteName,
  requireBranch,
} from "../../utils";


type Action = "config-remote" | "import" | "push" | "pull" | "status" | "setup";

export default class ModsLink extends Command {
  static id = "mod link";
  static summary = "Link a mod repository under mods/<slug> (setup/import/push/pull/status)";
  static description = `Make this monorepo the source of truth for a mod while mirroring to a read-only repo.

This command wraps git subtree operations to:
- Configure (or update) a remote for a mod
- Import a remote repo's history under mods/<slug>
- Push changes from mods/<slug> back to the mirror repo
- Pull any last-minute fixes from the mirror into mods/<slug>
- Setup: configure + import in one step
- Inspect status (repo, remotes, subtree presence)

Use --yes to skip safety prompts (non-interactive environments).
`;

  static examples = [
    // Configure the remote
    "<%= config.bin %> mod link --action config-remote --slug my-civ-mod --remote-url git@github.com:you/my-civ-mod.git",
    // Import (preserve history)
    "<%= config.bin %> mod link --action import --slug my-civ-mod --branch main",
    // Import (squash history)
    "<%= config.bin %> mod link --action import --slug my-civ-mod --branch main --squash",
    // Push subtree updates to mirror
    "<%= config.bin %> mod link --action push --slug my-civ-mod --branch main",
    // Push and auto fast-forward trunk after push
    "<%= config.bin %> mod link --action push --slug my-civ-mod --branch release -ff -t main",
    // Pull hotfixes from mirror into subtree (must match --squash mode used on add)
    "<%= config.bin %> mod link --action pull --slug my-civ-mod --branch main",
    // Setup: configure + import
    "<%= config.bin %> mod link --action setup --remote-url git@github.com:you/my-civ-mod.git --branch main --slug my-civ-mod",
    // Show status and diagnostics
    "<%= config.bin %> mod link --action status --slug my-civ-mod",
  ];

  static flags = {
    action: Flags.string({
      description: "Operation to perform",
      options: ["config-remote", "import", "push", "pull", "status", "setup"],
      char: "a",
      // Not required: we'll show a friendly usage summary when missing
    }),
    slug: Flags.string({
      description: 'Mod slug (directory under mods/, e.g., "my-civ-mod"). For setup, defaults from remote repo name.',
      char: "s",
    }),
    // Hidden alias for slug
    id: Flags.string({
      description: "Alias for --slug",
      hidden: true,
    }),
    remoteName: Flags.string({
      description: "Git remote name (default: mod-<slug>)",
      char: "R",
    }),
    // Hidden alias for remoteName
    name: Flags.string({
      description: "Alias for --remote-name",
      hidden: true,
    }),
    remoteUrl: Flags.string({
      description: "Git remote URL (e.g., git@github.com:you/repo.git)",
      char: "u",
    }),
    // Hidden alias for remoteUrl
    url: Flags.string({
      description: "Alias for --remote-url",
      hidden: true,
    }),
    branch: Flags.string({
      description: "Branch to track for import/push/pull/setup (push/pull use saved branch if omitted)",
      char: "b",
    }),
    squash: Flags.boolean({
      description: "Use history squash for add/pull (must match across operations)",
      default: false,
      char: "S",
    }),
    yes: Flags.boolean({
      description: 'Assume "yes" to safety prompts (non-interactive)',
      default: false,
      char: "y",
    }),
    autoUnshallow: Flags.boolean({
      description: "Automatically unshallow the repo if required for subtree operations",
      default: undefined,
      char: "U",
    }),
    verbose: Flags.boolean({
      description: "Show underlying git commands (verbose)",
      default: false,
      char: "v",
    }),
    autoFastForwardTrunk: Flags.boolean({
      description: "After push, fast-forward the remote trunk branch if possible (FF-only)",
      default: false,
      char: "f",
    }),
    trunk: Flags.string({
      description: "Override trunk branch name for FF update (defaults to remote's default)",
      char: "t",
    }),
    overwrite: Flags.boolean({
      description: "If subtree path exists, overwrite local directory with imported remote",
      default: false,
    }),
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parse(ModsLink);
    const action = flags.action as Action | undefined;
    // Auto-fill slug: if not provided and exactly one registered slug exists, use it
    let slug = flags.slug ?? (flags as any).id;
    let usedAutoSlug = false;
    if (!slug) {
      try {
        const slugs = await listRegisteredSlugs();
        if (slugs.length === 1) {
          slug = slugs[0];
          usedAutoSlug = true;
        } else if (slugs.length > 1) {
          this.log(`Registered slugs: ${slugs.join(", ")}`);
        }
      } catch {}
    }
    if (usedAutoSlug && slug) this.log(`Using slug from config: ${slug}`);
    const branch = flags.branch; // no default; undefined means use persisted for push/pull
    const squash = !!flags.squash;
    const yes = !!flags.yes;
    const verbose = !!flags.verbose;
    const autoUnshallow = flags.autoUnshallow; // may be undefined
    const autoFastForwardTrunk = !!flags.autoFastForwardTrunk;
    const trunk = flags.trunk;
    const providedRemoteUrl = flags.remoteUrl ?? (flags as any).url;
    const providedRemoteName = flags.remoteName ?? (flags as any).name;

    if (!action) {
      this.log("No --action provided. Available actions: setup, import, push, pull, status, config-remote\n");
      this.log("Quick start:");
      this.log("  - Setup (configure + import):");
      this.log("    $ civ7 mod link --action setup --remote-url <git-url> --branch main [--slug <slug>]");
      this.log("  - Status:");
      this.log("    $ civ7 mod link --action status [--slug <slug>]\n");
      this.log("See --help for full usage and examples.");
      this.exit(2);
      return;
    }

    // Derived defaults
    const remoteName = await resolveRemoteName({
      domain: "mod",
      slug,
      remoteName: providedRemoteName,
      remoteUrl: providedRemoteUrl,
      verbose,
      logger: this,
    });
    const prefix = slug ? path.posix.join("mods", slug) : undefined;

    // Route actions
    switch (action) {
      case "status":
        await this.handleStatus(slug ?? undefined, remoteName, branch, verbose);
        return;

      case "config-remote": {
        const rName = await requireRemoteName({
          domain: "mod",
          slug,
          remoteName,
          remoteUrl: providedRemoteUrl,
          verbose,
          logger: this,
        });
        if (!providedRemoteUrl) {
          this.error(
            "config-remote requires --remote-url <url>. Example: civ7 mod link --action config-remote --slug my-mod --remote-url git@github.com:you/my-mod.git",
          );
        }
        await configureRemote({
          remoteName: rName,
          remoteUrl: providedRemoteUrl!,
          branch: branch ?? "main",
          verbose,
          logger: this,
        });
        try {
          const cfg = await getRemotePushConfig(rName, { verbose });
          this.log("Push config:");
          this.log(`  trunk: ${cfg.trunk ?? "(auto)"}`);
          this.log(`  autoFastForwardTrunk: ${cfg.autoFastForwardTrunk ?? false}`);
          this.log(`  createPrOnFfBlock: ${cfg.createPrOnFfBlock ?? false}`);
          if (cfg.prTitle) this.log(`  prTitle: ${cfg.prTitle}`);
          if (cfg.prBody) this.log(`  prBody: ${cfg.prBody}`);
          this.log(`  prDraft: ${cfg.prDraft ?? false}`);
          this.log(`  prAutoMerge: ${cfg.prAutoMerge ?? true}`);
          this.log(`  prMergeStrategy: ${cfg.prMergeStrategy ?? 'rebase'}`);
        } catch {}
        return;
      }

      case "import": {
        if (!slug)
          this.error("Missing required --slug <slug>. Tip: use --action setup to infer from --remote-url.");
        const rName = await requireRemoteName({
          domain: "mod",
          slug,
          remoteName,
          remoteUrl: providedRemoteUrl,
          verbose,
          logger: this,
        });
        await importSubtree({
          prefix: prefix!,
          remoteName: rName,
          branch: branch ?? "main",
          remoteUrl: providedRemoteUrl,
          squash,
          allowDirty: yes,
          autoUnshallow: autoUnshallow ?? false,
          verbose,
          logger: this,
        });
        return;
      }

      case "push": {
        if (!slug)
          this.error("Missing required --slug <slug>. Tip: use --action setup to infer from --remote-url.");
        const rName = await requireRemoteName({
          domain: "mod",
          slug,
          remoteName,
          remoteUrl: providedRemoteUrl,
          verbose,
          logger: this,
        });
        const effectiveBranch = await requireBranch({
          domain: "mod",
          slug,
          branch,
          verbose,
          logger: this,
        });
        await pushSubtree({
          prefix: prefix!,
          remoteName: rName,
          branch: effectiveBranch,
          allowDirty: yes,
          autoUnshallow: autoUnshallow ?? false,
          autoFastForwardTrunk,
          trunk,
          verbose,
          logger: this,
        });
        return;
      }

      case "pull": {
        if (!slug)
          this.error("Missing required --slug <slug>. Tip: use --action setup to infer from --remote-url.");
        const rName = await requireRemoteName({
          domain: "mod",
          slug,
          remoteName,
          remoteUrl: providedRemoteUrl,
          verbose,
          logger: this,
        });
        const effectiveBranch = await requireBranch({
          domain: "mod",
          slug,
          branch,
          verbose,
          logger: this,
        });
        await pullSubtree({
          prefix: prefix!,
          remoteName: rName,
          branch: effectiveBranch,
          squash,
          allowDirty: yes,
          autoUnshallow: autoUnshallow ?? false,
          verbose,
          logger: this,
        });
        return;
      }

      case "setup":
        await this.handleSetup({
          remoteUrl: providedRemoteUrl,
          branch: branch ?? "main",
          slug,
          remoteName: providedRemoteName,
          squash,
          yes,
          verbose,
          autoUnshallow: autoUnshallow ?? true, // prefer full history by default
          trunk,
        });
        return;

      default:
        this.error(`Unknown action: ${action}`);
    }
  }

  // Actions

  private async handleStatus(
    slug: string | undefined,
    remoteName: string | undefined,
    branch: string | undefined,
    verbose: boolean,
  ) {
    const status = await getModStatus({ slug, remoteName, branch, verbose });
    this.log("Git status:");
    this.log(`- Repo root: ${status.repoRoot ?? "(not a git repo)"}`);
    this.log(`- Shallow: ${status.shallow ? "yes" : "no"}`);
    this.log(`- Clean worktree: ${status.clean ? "yes" : "no"}`);
    this.log(`- Subtree available: ${status.hasSubtree ? "yes" : "no"}`);
    this.log("- Remotes:");
    if (!status.remotes || status.remotes.length === 0) this.log("  (none)");
    for (const r of status.remotes ?? []) {
      this.log(`  - ${r.name}: ${r.url ?? "(no url)"}`);
      const defaultBranch = (r as any).defaultBranch ?? null;
      const resolvedTrunk = (r as any).resolvedTrunk ?? null;
      const trunkPushAllowed = (r as any).trunkPushAllowed ?? null;
      const pushStr = trunkPushAllowed === null ? "unknown" : trunkPushAllowed ? "allowed" : "blocked";
      this.log(
        `    default=${defaultBranch ?? "(unknown)"}  trunk=${resolvedTrunk ?? "(unknown)"}  trunkPush=${pushStr}`,
      );
    }

    if (slug) {
      this.log("");
      this.log(`Subtree target for slug "${slug}":`);
      this.log(`- Prefix: ${status.modsPrefix}`);
      this.log(`- Exists: ${status.subtreeExists ? "yes" : "no"}`);
      if (remoteName) {
        this.log(
          `- Remote: ${status.remoteConfigured ? `${remoteName} (${status.remoteUrl ?? "no url"})` : "(not configured)"}`,
        );
        this.log(`- Branch: ${status.branch}`);
      }
    }
  }

  private async handleSetup(opts: {
    remoteUrl?: string;
    branch: string;
    slug?: string;
    remoteName?: string;
    squash: boolean;
    yes: boolean;
    verbose: boolean;
    autoUnshallow: boolean;
    trunk?: string;
    overwrite?: boolean;
  }) {
    const { remoteUrl, branch, slug, remoteName, squash, yes, verbose, autoUnshallow, trunk, overwrite } = opts;
    if (!remoteUrl) {
      this.error(
        "setup requires --remote-url <url>. Example: civ7 mod link --action setup --remote-url git@github.com:you/my-mod.git --branch main [--slug my-mod]"
      );
    }

    const inferredSlug = slug ?? "(inferred from remote)";
    const inferredRemoteName =
      (await resolveRemoteName({
        domain: "mod",
        slug,
        remoteName,
        remoteUrl,
        verbose,
        logger: this,
      })) ?? "(inferred after --remote-url)";
    this.log(
      `Setup starting: remoteUrl=${remoteUrl} branch=${branch} slug=${inferredSlug} remoteName=${inferredRemoteName} squash=${
        squash ? "yes" : "no"
      } autoUnshallow=${autoUnshallow ? "yes" : "no"}`,
    );

    const res = await linkPlugin({
      remoteUrl,
      branch,
      slug,
      remoteName,
      squash,
      allowDirty: yes,
      verbose,
      autoUnshallow,
      trunk,
      overwrite,
    });
    this.log(`✅ Setup complete: ${res.slug} at ${res.prefix} from ${res.remoteName}/${res.branch}`);
    // If path existed and we skipped import, hint next steps
    try {
      const abs = path.join(process.cwd(), res.prefix);
      if (fs.existsSync(abs)) {
        const entries = fs.readdirSync(abs);
        if (entries.length > 0 && !overwrite) {
          this.log(`Note: ${res.prefix} already existed. Import was skipped. You can now run:`);
          this.log(`  - Pull remote into subtree: civ7 mod link -a pull -s ${res.slug} -R ${res.remoteName} -b ${res.branch}`);
          this.log(`  - Or push local subtree to remote: civ7 mod link -a push -s ${res.slug} -R ${res.remoteName} -b ${res.branch}`);
          this.log(`  - To overwrite local with remote: re-run setup with --overwrite`);
        }
      }
    } catch {}
    try {
      const effectiveRemoteName =
        (await resolveRemoteName({
          domain: "mod",
          slug,
          remoteName,
          remoteUrl: remoteUrl!,
          verbose,
          logger: this,
        })) ?? "";
      const cfg = await getRemotePushConfig(effectiveRemoteName, { verbose });
      this.log("Push config:");
      this.log(`  trunk: ${cfg.trunk ?? "(auto)"}`);
      this.log(`  autoFastForwardTrunk: ${cfg.autoFastForwardTrunk ?? false}`);
      this.log(`  createPrOnFfBlock: ${cfg.createPrOnFfBlock ?? false}`);
      this.log(`  prDraft: ${cfg.prDraft ?? false}`);
      this.log(`  prAutoMerge: ${cfg.prAutoMerge ?? true}`);
      this.log(`  prMergeStrategy: ${cfg.prMergeStrategy ?? 'rebase'}`);
      if (cfg.prTitle) this.log(`  prTitle: ${cfg.prTitle}`);
      if (cfg.prBody) this.log(`  prBody: ${cfg.prBody}`);
    } catch {}
  }
}
