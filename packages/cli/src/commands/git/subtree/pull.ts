import SubtreePullBase from '../../../base/subtree/SubtreePullBase.js';

export default class GitPull extends SubtreePullBase {
  static summary = 'Pull remote changes into a subtree';
  static description = 'Fetch and merge updates from the remote repository into the local subtree.';

  protected domain = 'git';
}
