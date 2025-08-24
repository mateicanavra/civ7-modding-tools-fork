import { Args, Flags } from '@oclif/core';
import SubtreeCommand from '../base/SubtreeCommand.js';
import { configureRemote, importSubtree } from '../utils/git.js';

export default abstract class ImportBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
    remoteUrl: Flags.string({
      description: 'Git remote URL',
      char: 'u',
      required: true,
    }),
    squash: Flags.boolean({
      description: 'Squash history when importing',
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
    await configureRemote({
      domain: this.domain,
      slug,
      remoteUrl: flags.remoteUrl,
      branch: flags.branch,
      verbose: flags.verbose,
      logger: this,
    });
    await importSubtree({
      domain: this.domain,
      slug,
      prefix,
      squash: flags.squash,
      allowDirty: flags.yes,
      autoUnshallow: flags.autoUnshallow,
      verbose: flags.verbose,
      logger: this,
    });
  }
}
