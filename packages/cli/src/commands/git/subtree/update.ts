import SubtreeConfigRemoteBase from '../../../base/subtree/SubtreeConfigRemoteBase.js';

export default class GitSubtreeUpdate extends SubtreeConfigRemoteBase {
  static summary = 'Configure the remote for a git subtree';
  static description = 'Add or update the git remote for a subtree.';

  protected domain = 'git';
}
