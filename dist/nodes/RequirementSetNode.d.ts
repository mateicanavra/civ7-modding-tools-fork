import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { REQUIREMENT_SET } from "../constants";
export type TRequirementSetNode = Pick<RequirementSetNode, "requirementSetId" | "requirementSetType">;
export declare class RequirementSetNode extends BaseNode<TRequirementSetNode> {
    requirementSetId: string | null;
    requirementSetType: TObjectValues<typeof REQUIREMENT_SET> | null;
    constructor(payload?: Partial<TRequirementSetNode>);
}
