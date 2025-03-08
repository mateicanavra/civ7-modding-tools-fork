import { TObjectValues } from "../types";
import { ADVISORY } from "../constants";
import { BaseNode } from "./BaseNode";
export type TProgressionTreeAdvisoryNode = Pick<ProgressionTreeAdvisoryNode, "progressionTreeNodeType" | "advisoryClassType">;
export declare class ProgressionTreeAdvisoryNode extends BaseNode<TProgressionTreeAdvisoryNode> {
    progressionTreeNodeType: `NODE_${string}` | null;
    advisoryClassType: TObjectValues<typeof ADVISORY> | null;
    constructor(payload?: Partial<TProgressionTreeAdvisoryNode>);
}
