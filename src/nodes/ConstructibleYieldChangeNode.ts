import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { YIELD } from "../constants";

export type TConstructibleYieldChangeNode = Pick<ConstructibleYieldChangeNode,
    "constructibleType" |
    "yieldType" |
    "yieldChange"
>;

export class ConstructibleYieldChangeNode extends BaseNode<TConstructibleYieldChangeNode> {
    constructibleType = 'BUILDING_';
    yieldType: TObjectValues<typeof YIELD> = YIELD.GOLD;
    yieldChange = 1;

    constructor(payload: Partial<TConstructibleYieldChangeNode> = {}) {
        super();
        this.fill(payload);
    }
}
