import * as lodash from "lodash";

import { BaseNode } from "./BaseNode";
import { TypeTagNode } from "./TypeTagNode";
import { TypeNode } from "./TypeNode";
import { ConstructibleNode } from "./ConstructibleNode";
import { UnitNode } from "./UnitNode";
import { TagNode } from "./TagNode";
import { UnitStatNode } from "./UnitStatNode";
import { UnitCostNode } from "./UnitCostNode";
import { VisualRemapNode } from "./VisualRemapNode";
import { UnitReplaceNode } from "./UnitReplaceNode";
import { EnglishTextNode } from "./EnglishTextNode";
import { CivilizationNode } from "./CivilizationNode";
import { TraitNode } from "./TraitNode";
import { CivilizationTraitNode } from "./CivilizationTraitNode";
import { CivilizationTagNode } from "./CivilizationTagNode";
import { LegacyCivilizationNode } from "./LegacyCivilizationNode";
import { LegacyCivilizationTraitNode } from "./LegacyCivilizationTraitNode";
import { IconDefinitionNode } from "./IconDefinitionNode";
import { CivilizationItemNode } from "./CivilizationItemNode";
import { ConstructibleValidDistrictNode } from "./ConstructibleValidDistrictNode";
import { ConstructibleMaintenanceNode } from "./ConstructibleMaintenanceNode";
import { ConstructibleYieldChangeNode } from "./ConstructibleYieldChangeNode";
import { BuildingNode } from "./BuildingNode";
import { ShellCivilizationNodeSlice } from "./slices/ShellCivilizationNodeSlice";
import { GameCivilizationNodeSlice } from "./slices/GameCivilizationNodeSlice";
import { TraitModifierNode } from "./TraitModifierNode";
import { CivilizationUnlockNode } from "./CivilizationUnlockNode";
import { KindNode } from "./KindNode";
import { UnlockNode } from "./UnlockNode";
import { UnlockRewardNode } from "./UnlockRewardNode";
import { RequirementSetNode } from "./RequirementSetNode";
import { RequirementNode } from "./RequirementNode";
import { RequirementArgumentNode } from "./RequirementArgumentNode";
import { RequirementSetRequirementNode } from "./RequirementSetRequirementNode";
import { UnlockRequirementNode } from "./UnlockRequirementNode";
import { UnlockConfigurationValueNode } from "./UnlockConfigurationValueNode";
import { AdjacencyYieldChangeNode } from "./AdjacencyYieldChangeNode";
import { ConstructibleAdjacencyNode } from "./ConstructibleAdjacencyNode";
import { WarehouseYieldChangeNode } from "./WarehouseYieldChangeNode";
import { ConstructibleWarehouseYieldNode } from "./ConstructibleWarehouseYieldNode";

export type TDatabase = Pick<DatabaseNode,
    "civilizationItems" |
    "civilizationTags" |
    "civilizationTraits" |
    "civilizations" |
    "constructibleMaintenances" |
    "constructibleValidDistricts" |
    "constructibleYieldChanges" |
    "constructibles" |
    "englishText" |
    "iconDefinitions" |
    "legacyCivilizationTraits" |
    "legacyCivilizations" |
    "civilizationUnlocks" |
    "tags" |
    "traitModifiers" |
    "traits" |
    "typeTags" |
    "kinds" |
    "types" |
    "unitCosts" |
    "buildings" |
    "unitReplaces" |
    "unitStats" |
    "units" |
    "unlocks" |
    "unlockRequirements" |
    "unlockConfigurationValues" |
    "requirementSets" |
    "requirementArguments" |
    "requirementSetRequirements" |
    "unlockRewards" |
    "adjacencyYieldChanges" |
    "constructibleAdjacencies" |
    "warehouseYieldChanges" |
    "constructibleWarehouseYields" |
    "visualRemaps"
>;

export class DatabaseNode extends BaseNode<TDatabase> {
    _name = 'Database';

    kinds: KindNode[] = [];
    types: TypeNode[] = [];
    tags: TagNode[] = [];
    typeTags: TypeTagNode[] = [];
    traits: TraitNode[] = [];
    traitModifiers: TraitModifierNode[] = [];

    civilizations: CivilizationNode[] | ShellCivilizationNodeSlice[] | GameCivilizationNodeSlice[] = [];
    civilizationItems: CivilizationItemNode[] = [];
    civilizationTags: CivilizationTagNode[] = [];
    civilizationTraits: CivilizationTraitNode[] = [];
    civilizationUnlocks: CivilizationUnlockNode[] = [];
    legacyCivilizationTraits: LegacyCivilizationTraitNode[] = [];
    legacyCivilizations: LegacyCivilizationNode[] = [];

    buildings: BuildingNode[] = [];
    constructibles: ConstructibleNode[] = [];
    constructibleMaintenances: ConstructibleMaintenanceNode[] = [];
    constructibleValidDistricts: ConstructibleValidDistrictNode[] = [];
    constructibleYieldChanges: ConstructibleYieldChangeNode[] = [];
    adjacencyYieldChanges: AdjacencyYieldChangeNode[] = [];
    constructibleAdjacencies: ConstructibleAdjacencyNode[] = [];
    warehouseYieldChanges: WarehouseYieldChangeNode[] = [];
    constructibleWarehouseYields: ConstructibleWarehouseYieldNode[] = [];

    units: UnitNode[] = [];
    unitCosts: UnitCostNode[] = [];
    unitReplaces: UnitReplaceNode[] = [];
    unitStats: UnitStatNode[] = [];

    englishText: EnglishTextNode[] = [];
    iconDefinitions: IconDefinitionNode[] = [];
    visualRemaps: VisualRemapNode[] = [];

    unlocks: UnlockNode[] = [];
    unlockRewards: UnlockRewardNode[] = [];
    unlockRequirements: UnlockRequirementNode[] = [];
    unlockConfigurationValues: UnlockConfigurationValueNode[] = [];

    requirementSets: RequirementSetNode[] = [];
    requirements: RequirementNode[] = [];
    requirementArguments: RequirementArgumentNode[] = [];
    requirementSetRequirements: RequirementSetRequirementNode[] = [];

    constructor(payload: Partial<TDatabase> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        const except = [];
        const additionalMapping = {
            constructibleMaintenances: 'Constructible_Maintenances',
            constructibleValidDistricts: 'Constructible_ValidDistricts',
            constructibleYieldChanges: 'Constructible_YieldChanges',
            constructibleAdjacencies: 'Constructible_Adjacencies',
            adjacencyYieldChanges: 'Adjacency_YieldChanges',
            warehouseYieldChanges: 'Warehouse_YieldChanges',
            constructibleWarehouseYields: 'Constructible_WarehouseYields',
            unitCosts: 'Unit_Costs',
            unitStats: 'Unit_Stats',
        }
        const data = Object.keys(this)
            .filter(key => !except.includes(key))
            .reduce((prev, current) => {
                if (Array.isArray(this[current])) {
                    if (this[current].length === 0) {
                        return prev;
                    }

                    let key = additionalMapping[current]
                        ? additionalMapping[current]
                        : lodash.startCase(current).replace(/ /g, "");

                    return {
                        ...prev,
                        [key]: this[current].map(item => item.toXmlElement())
                    }
                }
                return prev;
            }, {});
        return {
            Database: {
                ...data,
            }
        }
    }
}
