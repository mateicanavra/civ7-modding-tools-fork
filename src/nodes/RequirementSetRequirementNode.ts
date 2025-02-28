import { BaseNode } from "./BaseNode";

export type TRequirementSetRequirementNode = Pick<RequirementSetRequirementNode,
    "requirementSetId" |
    "requirementId"
>;

export class RequirementSetRequirementNode extends BaseNode<TRequirementSetRequirementNode> {
    requirementSetId: string = 'REQSET_';
    requirementId: string = 'REQ_'

    constructor(payload: Partial<TRequirementSetRequirementNode> = {}) {
        super();
        this.fill(payload);
    }
}
