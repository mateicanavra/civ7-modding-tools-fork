import SubtreeSetupBase from '../../../base/subtree/SubtreeSetupBase.js';

export default class GitSetup extends SubtreeSetupBase {
  static summary = 'Configure and import a repository into a subtree';
  static description = 'Adds the remote and imports the repository under a prefix.';

  protected domain = 'git';
}
