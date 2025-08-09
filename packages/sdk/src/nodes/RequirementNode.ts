import { TObjectValues } from "../types";
import { REQUIREMENT } from "../constants";

import { BaseNode } from "./BaseNode";
import { randomUUID } from "node:crypto";

export type TRequirementNode = Pick<RequirementNode,
    "requirementId" |
    "requirementType"
>;

export class RequirementNode extends BaseNode<TRequirementNode> {
    requirementId: string | null = 'REQ_' + randomUUID().replace(/-/g, "_").toLocaleUpperCase();
    requirementType: TObjectValues<typeof REQUIREMENT> | null = REQUIREMENT.IS_AGE_COUNT;

    constructor(payload: Partial<TRequirementNode> = {}) {
        super();
        this.fill(payload);
    }
}
