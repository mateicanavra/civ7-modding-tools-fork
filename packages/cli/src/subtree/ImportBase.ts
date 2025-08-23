import { Args } from '@oclif/core';
import SubtreeCommand from '../base/SubtreeCommand.js';
import { importSubtree } from '../utils/git.js';

export default abstract class ImportBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
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
      flags: ctor.flags ?? (this as any).flags ?? ImportBase.flags,
      args: ctor.args ?? (this as any).args ?? ImportBase.args,
    });
    const slug = args.slug as string;
    const prefix = this.getPrefix(slug);
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
    });
  }
}
