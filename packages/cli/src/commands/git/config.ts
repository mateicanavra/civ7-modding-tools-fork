import ConfigRemoteBase from '../../subtree/ConfigRemoteBase.js';

export default class GitConfig extends ConfigRemoteBase {
  static summary = 'Configure the remote for a git subtree';
  static description = 'Add or update the git remote for a subtree.';

  protected domain = 'git';
}
