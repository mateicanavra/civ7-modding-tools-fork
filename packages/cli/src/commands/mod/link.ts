import ModSetup from './setup.js';

export default class ModLink extends ModSetup {
  static summary = 'Deprecated alias for mod setup';
  static description = 'Use "mod setup" instead.';

  async run() {
    this.log('`civ7 mod link` is deprecated. Use `civ7 mod setup` instead.');
    return super.run();
  }
}
