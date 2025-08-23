import { Args, Flags } from '@oclif/core';
import SubtreeCommand from '../base/SubtreeCommand.js';
import { configureRemote, importSubtree } from '../utils/git.js';

export default abstract class SetupBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
    overwrite: Flags.boolean({
      description: 'Overwrite existing subtree directory if non-empty',
      default: false,
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
      flags: ctor.flags ?? (this as any).flags ?? SetupBase.flags,
      args: ctor.args ?? (this as any).args ?? SetupBase.args,
    });
    const slug = args.slug as string;
    const prefix = this.getPrefix(slug);
    await configureRemote({
      domain: this.domain,
      slug,
      remoteName: flags.remoteName,
      remoteUrl: flags.remoteUrl,
      branch: flags.branch,
      verbose: flags.verbose,
      logger: this,
    });
    await importSubtree({
      domain: this.domain,
      slug,
      prefix,
      remoteName: flags.remoteName,
      remoteUrl: flags.remoteUrl,
      branch: flags.branch,
      squash: flags.squash,
      allowDirty: flags.yes,
      autoUnshallow: flags.autoUnshallow,
      verbose: flags.verbose,
      logger: this,
      remoteRequiredMessage: 'setup requires --remote-url <url>',
    });
  }
}
