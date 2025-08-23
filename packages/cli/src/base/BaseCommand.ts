import { Command, Flags } from '@oclif/core';

export default abstract class BaseCommand extends Command {
  static baseFlags = {
    json: Flags.boolean({
      description: 'Output machine-readable JSON',
      default: false,
    }),
  } as const;

  protected logJson(value: unknown) {
    this.log(JSON.stringify(value, null, 2));
  }
}
