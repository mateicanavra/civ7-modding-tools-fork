import ImportBase from '../../subtree/ImportBase.js';

export default class GitImport extends ImportBase {
  static summary = 'Import a remote repository into a local subtree';
  static description = 'Preserve history by importing a remote repository under a prefix.';

  protected domain = 'git';
}
