import PushBase from '../../../subtree/PushBase.js';

export default class GitPush extends PushBase {
  static summary = 'Push a subtree to its configured remote';
  static description = 'Push local subtree changes back to the remote repository.';

  protected domain = 'git';
}
