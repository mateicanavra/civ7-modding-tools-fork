import { TObjectValues } from "../types";
import { ADVISORY } from "../constants";
import { BaseNode } from "./BaseNode";
export type TUnitAdvisoryNode = Pick<UnitAdvisoryNode, "unitType" | "advisoryClassType">;
export declare class UnitAdvisoryNode extends BaseNode<TUnitAdvisoryNode> {
    unitType: string | null;
    advisoryClassType: TObjectValues<typeof ADVISORY> | null;
    constructor(payload?: Partial<TUnitAdvisoryNode>);
}
