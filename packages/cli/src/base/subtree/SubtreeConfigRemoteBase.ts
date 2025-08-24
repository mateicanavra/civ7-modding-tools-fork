import { Args, Flags } from '@oclif/core';
import SubtreeCommand from './SubtreeCommand.js';
import { configureRemote } from '../../utils/git.js';

export default abstract class SubtreeConfigRemoteBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
    repoUrl: Flags.string({
      description: 'Git repository URL',
      char: 'u',
    }),
  } as const;

  static args = {
    slug: Args.string({ description: 'Subtree slug', required: true }),
  } as const;

  async run() {
    const ctor: any = this.constructor;
    const { args, flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? SubtreeConfigRemoteBase.flags,
      args: ctor.args ?? (this as any).args ?? SubtreeConfigRemoteBase.args,
    });
    const slug = args.slug as string;
    await configureRemote({
      domain: this.domain,
      slug,
      repoUrl: flags.repoUrl,
      branch: flags.branch,
      verbose: flags.verbose,
      logger: this,
    });
  }
}
