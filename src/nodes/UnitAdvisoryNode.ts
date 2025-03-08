import { TObjectValues } from "../types";
import { ADVISORY, YIELD } from "../constants";

import { BaseNode } from "./BaseNode";

export type TUnitAdvisoryNode = Pick<UnitAdvisoryNode,
    "unitType" |
    "advisoryClassType"
>;

export class UnitAdvisoryNode extends BaseNode<TUnitAdvisoryNode> {
    unitType: string | null = 'UNIT_TYPE';
    advisoryClassType: TObjectValues<typeof ADVISORY> | null = ADVISORY.CLASS_FOOD;

    constructor(payload: Partial<TUnitAdvisoryNode> = {}) {
        super();
        this.fill(payload);
    }
}
