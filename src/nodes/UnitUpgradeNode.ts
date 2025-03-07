import { BaseNode } from "./BaseNode";

export type TUnitUpgradeNode = Pick<UnitUpgradeNode,
    "unit" |
    "upgradeUnit"
>;

export class UnitUpgradeNode extends BaseNode<TUnitUpgradeNode> {
    unit: string = 'UNIT_TYPE';
    upgradeUnit: string = 'UNIT_TYPE';

    constructor(payload: Partial<TUnitUpgradeNode> = {}) {
        super();
        this.fill(payload);
    }
}
