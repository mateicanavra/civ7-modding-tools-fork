import { BaseNode } from "./BaseNode";
export type TUnitReplaceNode = Pick<UnitReplaceNode, "civUniqueUnitType" | "replacesUnitType">;
export declare class UnitReplaceNode extends BaseNode<TUnitReplaceNode> {
    civUniqueUnitType: string | null;
    replacesUnitType: string | null;
    constructor(payload?: Partial<TUnitReplaceNode>);
}
