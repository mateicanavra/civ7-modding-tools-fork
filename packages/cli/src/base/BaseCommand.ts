import { Command } from '@oclif/core';

export default abstract class BaseCommand extends Command {
  protected logJson(value: unknown) {
    this.log(JSON.stringify(value, null, 2));
  }
}
