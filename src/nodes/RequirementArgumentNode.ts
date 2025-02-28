import { BaseNode } from "./BaseNode";

export type TRequirementArgumentNode = Pick<RequirementArgumentNode,
    "requirementId" |
    "name" |
    "value"
>;

export class RequirementArgumentNode extends BaseNode<TRequirementArgumentNode> {
    requirementId: string = 'REQ_';
    name: string = '';
    value: string = '';

    constructor(payload: Partial<TRequirementArgumentNode> = {}) {
        super();
        this.fill(payload);
    }
}
