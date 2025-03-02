import { TObjectValues } from "../types";
import { PLUNDER } from "../constants";

import { BaseNode } from "./BaseNode";

export type TConstructiblePlunderNode = Pick<ConstructiblePlunderNode,
    "constructibleType" |
    "plunderType" |
    "amount"
>;

export class ConstructiblePlunderNode extends BaseNode<TConstructiblePlunderNode> {
    constructibleType = 'BUILDING_';
    plunderType: TObjectValues<typeof PLUNDER> = PLUNDER.HEAL;
    amount: number = 30;

    constructor(payload: Partial<TConstructiblePlunderNode> = {}) {
        super();
        this.fill(payload);
    }
}
