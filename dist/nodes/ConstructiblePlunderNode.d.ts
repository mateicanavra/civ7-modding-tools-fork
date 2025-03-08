import { TObjectValues } from "../types";
import { PLUNDER } from "../constants";
import { BaseNode } from "./BaseNode";
export type TConstructiblePlunderNode = Pick<ConstructiblePlunderNode, "constructibleType" | "plunderType" | "amount">;
export declare class ConstructiblePlunderNode extends BaseNode<TConstructiblePlunderNode> {
    constructibleType: string | null;
    plunderType: TObjectValues<typeof PLUNDER> | null;
    amount: number | null;
    constructor(payload?: Partial<TConstructiblePlunderNode>);
}
