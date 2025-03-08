import { TObjectValues } from "../types";
import { REQUIREMENT } from "../constants";
import { BaseNode } from "./BaseNode";
export type TRequirementNode = Pick<RequirementNode, "requirementId" | "requirementType">;
export declare class RequirementNode extends BaseNode<TRequirementNode> {
    requirementId: string | null;
    requirementType: TObjectValues<typeof REQUIREMENT> | null;
    constructor(payload?: Partial<TRequirementNode>);
}
