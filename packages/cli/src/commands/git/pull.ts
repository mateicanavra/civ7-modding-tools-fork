import PullBase from '../../subtree/PullBase.js';

export default class GitPull extends PullBase {
  static summary = 'Pull remote changes into a subtree';
  static description = 'Fetch and merge updates from the remote repository into the local subtree.';

  protected domain = 'git';
}
