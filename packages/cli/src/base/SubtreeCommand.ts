import { Flags } from '@oclif/core';
import BaseCommand from './BaseCommand.js';
import { resolveBranch, resolveRemoteName } from '../utils/git.js';

export default abstract class SubtreeCommand extends BaseCommand {
  static baseFlags = {
    ...BaseCommand.baseFlags,
    remoteName: Flags.string({
      description: 'Git remote name (advanced override)',
      hidden: true,
    }),
    branch: Flags.string({
      description: 'Branch to track',
      char: 'b',
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
