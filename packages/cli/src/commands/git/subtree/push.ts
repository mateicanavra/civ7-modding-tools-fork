import SubtreePushBase from '../../../base/subtree/SubtreePushBase.js';

export default class GitPush extends SubtreePushBase {
  static summary = 'Push a subtree to its configured remote';
  static description = 'Push local subtree changes back to the remote repository.';

  protected domain = 'git';
}
