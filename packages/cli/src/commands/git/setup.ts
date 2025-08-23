import SetupBase from '../../subtree/SetupBase.js';

export default class GitSetup extends SetupBase {
  static summary = 'Configure and import a repository into a subtree';
  static description = 'Adds the remote and imports the repository under a prefix.';

  protected domain = 'git';
}
