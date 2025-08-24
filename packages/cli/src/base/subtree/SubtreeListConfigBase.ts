import { Flags } from '@oclif/core';
import BaseCommand from '../BaseCommand.js';
import { listSubtreeConfigs } from '../../utils/git.js';

export default abstract class SubtreeListConfigBase extends BaseCommand {
  static flags = {
    json: Flags.boolean({
      description: 'Output machine-readable JSON',
      default: false,
    }),
    verbose: Flags.boolean({
      description: 'Show underlying git commands',
      default: false,
      char: 'v',
    }),
  } as const;

  protected abstract domain: string;

  async run() {
    const ctor: any = this.constructor;
    const { flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? SubtreeListConfigBase.flags,
    });
    const configs = await listSubtreeConfigs(this.domain, { verbose: flags.verbose });
    if (flags.json) {
      this.logJson(configs);
      return;
    }
    if (configs.length === 0) {
      this.log('No stored config entries.');
      return;
    }
    for (const cfg of configs) {
      this.log(`${cfg.slug}: ${cfg.repoUrl ?? '(no repoUrl)'} branch=${cfg.branch ?? '(none)'}`);
    }
  }
}
