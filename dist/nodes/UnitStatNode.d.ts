import { BaseNode } from "./BaseNode";
export type TUnitStatNode = Pick<UnitStatNode, "unitType" | "bombard" | "combat" | "range" | "rangedCombat">;
export declare class UnitStatNode extends BaseNode<TUnitStatNode> {
    unitType: string | null;
    bombard: number | null;
    combat: number | null;
    range: number | null;
    rangedCombat: number | null;
    constructor(payload?: Partial<TUnitStatNode>);
}
