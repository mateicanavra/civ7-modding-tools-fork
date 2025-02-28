import { TObjectValues } from "../types";
import { REQUIREMENT } from "../constants";

import { BaseNode } from "./BaseNode";

export type TRequirementNode = Pick<RequirementNode,
    "requirementId" |
    "requirementType"
>;

export class RequirementNode extends BaseNode<TRequirementNode> {
    requirementId: string = 'REQ_';
    requirementType: TObjectValues<typeof REQUIREMENT> = REQUIREMENT.IS_AGE_COUNT;

    constructor(payload: Partial<TRequirementNode> = {}) {
        super();
        this.fill(payload);
    }
}
