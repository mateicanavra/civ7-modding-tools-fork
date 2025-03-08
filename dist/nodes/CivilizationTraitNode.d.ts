import { BaseNode } from "./BaseNode";
export type TCivilizationTraitNode = Pick<CivilizationTraitNode, "traitType" | "civilizationType">;
export declare class CivilizationTraitNode extends BaseNode<TCivilizationTraitNode> {
    traitType: string | null;
    civilizationType: string | null;
    constructor(payload?: Partial<TCivilizationTraitNode>);
}
