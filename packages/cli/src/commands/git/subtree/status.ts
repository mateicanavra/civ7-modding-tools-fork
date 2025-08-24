import StatusBase from '../../../subtree/StatusBase.js';

export default class GitStatus extends StatusBase {
  static summary = 'Show git subtree status';
  static description = 'Displays push configuration for the subtree\'s remote.';

  protected domain = 'git';
}
