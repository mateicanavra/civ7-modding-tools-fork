import { BaseNode } from "./BaseNode";
export type TRequirementSetRequirementNode = Pick<RequirementSetRequirementNode, "requirementSetId" | "requirementId">;
export declare class RequirementSetRequirementNode extends BaseNode<TRequirementSetRequirementNode> {
    requirementSetId: string | null;
    requirementId: string | null;
    constructor(payload?: Partial<TRequirementSetRequirementNode>);
}
