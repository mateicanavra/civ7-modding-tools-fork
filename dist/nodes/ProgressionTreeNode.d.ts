import { TObjectValues } from "../types";
import { AGE, SYSTEM } from "../constants";
import { BaseNode } from "./BaseNode";
export type TProgressionTreeNode = Pick<ProgressionTreeNode, "progressionTreeType" | "ageType" | "systemType" | "name">;
export declare class ProgressionTreeNode extends BaseNode<TProgressionTreeNode> {
    progressionTreeType: `TREE_${string}` | null;
    ageType: TObjectValues<typeof AGE> | null;
    systemType: TObjectValues<typeof SYSTEM> | null;
    name: string | null;
    constructor(payload?: Partial<TProgressionTreeNode>);
}
