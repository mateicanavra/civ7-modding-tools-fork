import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { REQUIREMENT_SET } from "../constants";

export type TRequirementSetNode = Pick<RequirementSetNode,
    "requirementSetId" |
    "requirementSetType"
>;

export class RequirementSetNode extends BaseNode<TRequirementSetNode> {
    requirementSetId: string = 'REQSET_';
    requirementSetType: TObjectValues<typeof REQUIREMENT_SET> = REQUIREMENT_SET.TEST_ALL;

    constructor(payload: Partial<TRequirementSetNode> = {}) {
        super();
        this.fill(payload);
    }
}
