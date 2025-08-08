import { BaseNode } from "./BaseNode";

export type TUnitUpgradeNode = Pick<UnitUpgradeNode,
    "unit" |
    "upgradeUnit"
>;

export class UnitUpgradeNode extends BaseNode<TUnitUpgradeNode> {
    unit: string | null = 'UNIT_TYPE';
    upgradeUnit: string | null = 'UNIT_TYPE';

    constructor(payload: Partial<TUnitUpgradeNode> = {}) {
        super();
        this.fill(payload);
    }
}
