import { BaseNode } from "./BaseNode";

export type TRequirementSetNode = Pick<RequirementSetNode,
    "requirementSetId" |
    "requirementSetType"
>;

export class RequirementSetNode extends BaseNode<TRequirementSetNode> {
    requirementSetId: string = 'REQSET_';
    requirementSetType: string = 'REQUIREMENTSET_'

    constructor(payload: Partial<TRequirementSetNode> = {}) {
        super();
        this.fill(payload);
    }
}
