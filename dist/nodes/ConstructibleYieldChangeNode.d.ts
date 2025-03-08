import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { YIELD } from "../constants";
export type TConstructibleYieldChangeNode = Pick<ConstructibleYieldChangeNode, "constructibleType" | "yieldType" | "yieldChange">;
export declare class ConstructibleYieldChangeNode extends BaseNode<TConstructibleYieldChangeNode> {
    constructibleType: string | null;
    yieldType: TObjectValues<typeof YIELD> | null;
    yieldChange: number | null;
    constructor(payload?: Partial<TConstructibleYieldChangeNode>);
}
