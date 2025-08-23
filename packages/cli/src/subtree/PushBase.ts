import { Args, Flags } from '@oclif/core';
import SubtreeCommand from '../base/SubtreeCommand.js';
import { pushSubtree } from '../utils/git.js';

export default abstract class PushBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
    autoFastForwardTrunk: Flags.boolean({
      description: 'After push, attempt to fast-forward the remote trunk branch',
      default: false,
      char: 'f',
    }),
    trunk: Flags.string({
      description: 'Override trunk branch name',
      char: 't',
    }),
  } as const;

  static args = {
    slug: Args.string({ description: 'Subtree slug', required: true }),
  } as const;

  protected getPrefix(slug: string): string {
    return slug;
  }

  async run() {
    const ctor: any = this.constructor;
    const { args, flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? PushBase.flags,
      args: ctor.args ?? (this as any).args ?? PushBase.args,
    });
    const slug = args.slug as string;
    const prefix = this.getPrefix(slug);
    await pushSubtree({
      domain: this.domain,
      slug,
      prefix,
      remoteName: flags.remoteName,
      remoteUrl: flags.remoteUrl,
      branch: flags.branch,
      allowDirty: flags.yes,
      autoUnshallow: flags.autoUnshallow,
      autoFastForwardTrunk: flags.autoFastForwardTrunk,
      trunk: flags.trunk,
      verbose: flags.verbose,
      logger: this,
    });
  }
}
