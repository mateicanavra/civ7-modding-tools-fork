import { BaseNode } from "./BaseNode";
export type TUnitUpgradeNode = Pick<UnitUpgradeNode, "unit" | "upgradeUnit">;
export declare class UnitUpgradeNode extends BaseNode<TUnitUpgradeNode> {
    unit: string | null;
    upgradeUnit: string | null;
    constructor(payload?: Partial<TUnitUpgradeNode>);
}
