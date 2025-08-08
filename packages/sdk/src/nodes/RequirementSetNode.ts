import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { REQUIREMENT_SET } from "../constants";
import { randomUUID } from "node:crypto";

export type TRequirementSetNode = Pick<RequirementSetNode,
    "requirementSetId" |
    "requirementSetType"
>;

export class RequirementSetNode extends BaseNode<TRequirementSetNode> {
    requirementSetId: string | null = 'REQSET_' + randomUUID().replace(/-/g, "_").toLocaleUpperCase();
    requirementSetType: TObjectValues<typeof REQUIREMENT_SET> | null = REQUIREMENT_SET.TEST_ALL;

    constructor(payload: Partial<TRequirementSetNode> = {}) {
        super();
        this.fill(payload);
    }
}
