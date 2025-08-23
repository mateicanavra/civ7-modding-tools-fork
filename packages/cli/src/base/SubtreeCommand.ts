import { Flags } from '@oclif/core';
import BaseCommand from './BaseCommand.js';
import { resolveBranch, resolveRemoteName } from '../utils/git.js';

export default abstract class SubtreeCommand extends BaseCommand {
  static baseFlags = {
    remoteName: Flags.string({
      description: 'Git remote name (defaults from config or slug)',
      char: 'R',
    }),
    remoteUrl: Flags.string({
      description: 'Git remote URL',
      char: 'u',
    }),
    branch: Flags.string({
      description: 'Branch to track',
      char: 'b',
    }),
    squash: Flags.boolean({
      description: 'Squash history when importing/pulling',
      default: false,
      char: 'S',
    }),
    yes: Flags.boolean({
      description: 'Assume yes to safety prompts',
      default: false,
      char: 'y',
    }),
    autoUnshallow: Flags.boolean({
      description: 'Automatically unshallow the repo if needed',
      default: undefined,
      char: 'U',
    }),
    verbose: Flags.boolean({
      description: 'Show underlying git commands',
      default: false,
      char: 'v',
    }),
  } as const;

  protected abstract domain: string;

  protected async resolveRemoteName(opts: { slug?: string; flags: any }) {
    const { slug, flags } = opts;
    return resolveRemoteName({
      domain: this.domain,
      slug,
      remoteName: flags.remoteName,
      remoteUrl: flags.remoteUrl,
      verbose: flags.verbose,
      logger: this,
    });
  }

  protected async resolveBranch(opts: { slug: string; flags: any }) {
    const { slug, flags } = opts;
    return resolveBranch({
      domain: this.domain,
      slug,
      branch: flags.branch,
      verbose: flags.verbose,
      logger: this,
    });
  }
}
