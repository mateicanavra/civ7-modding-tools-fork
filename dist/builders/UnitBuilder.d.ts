import { TClassProperties, TObjectValues, TPartialRequired } from "../types";
import { DatabaseNode, TIconDefinitionNode, TUnitAdvisoryNode, TUnitCostNode, TUnitNode, TUnitReplaceNode, TUnitStatNode, TUnitUpgradeNode, TVisualRemapNode } from "../nodes";
import { UNIT_CLASS } from "../constants";
import { XmlFile } from "../files";
import { TUnitLocalization } from "../localizations";
import { BaseBuilder } from "./BaseBuilder";
type TUnitBuilder = TClassProperties<UnitBuilder>;
export declare class UnitBuilder extends BaseBuilder<TUnitBuilder> {
    _current: DatabaseNode;
    _localizations: DatabaseNode;
    _icons: DatabaseNode;
    _visualRemap: DatabaseNode | null;
    unit: TPartialRequired<TUnitNode, 'unitType'>;
    unitStat: Partial<TUnitStatNode>;
    unitCost: Partial<TUnitCostNode>;
    icon: TPartialRequired<TIconDefinitionNode, 'path'>;
    unitReplace: TPartialRequired<TUnitReplaceNode, 'replacesUnitType'> | null;
    unitUpgrade: TPartialRequired<TUnitUpgradeNode, 'upgradeUnit'> | null;
    visualRemap: TPartialRequired<TVisualRemapNode, 'to'> | null;
    unitAdvisories: TPartialRequired<TUnitAdvisoryNode, 'advisoryClassType'>[];
    localizations: TUnitLocalization[];
    typeTags: TObjectValues<typeof UNIT_CLASS>[];
    constructor(payload?: Partial<TUnitBuilder>);
    migrate(): this;
    build(): XmlFile[];
}
export {};
