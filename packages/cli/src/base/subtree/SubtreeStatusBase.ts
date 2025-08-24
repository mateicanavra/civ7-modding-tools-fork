import { Args, Flags } from '@oclif/core';
import BaseCommand from '../BaseCommand.js';
import { findRemoteNameForSlug, getRemotePushConfig, logRemotePushConfig } from '../../utils/git.js';

export default abstract class SubtreeStatusBase extends BaseCommand {
  static enableJsonFlag = true;

  static flags = {
    verbose: Flags.boolean({
      description: 'Show underlying git commands',
      default: false,
      char: 'v',
    }),
  } as const;

  static args = {
    slug: Args.string({ description: 'Subtree slug', required: false }),
  } as const;

  protected abstract domain: string;

  async run() {
    const ctor: any = this.constructor;
    const { args, flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? SubtreeStatusBase.flags,
      args: ctor.args ?? (this as any).args ?? SubtreeStatusBase.args,
    });
    const slug = args.slug as string | undefined;
    const remoteName = slug
      ? await findRemoteNameForSlug(this.domain, slug)
      : undefined;
    if (this.jsonEnabled()) {
      const config = remoteName
        ? await getRemotePushConfig(remoteName, { verbose: flags.verbose })
        : undefined;
      return { remoteName, config };
    }

    if (remoteName) {
      await logRemotePushConfig(remoteName, { logger: this, verbose: flags.verbose });
    }
  }
}
