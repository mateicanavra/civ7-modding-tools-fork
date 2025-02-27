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
    "tags" |
    "traitModifiers" |
    "traits" |
    "typeTags" |
    "types" |
    "unitCosts" |
    "buildings" |
    "unitReplaces" |
    "unitStats" |
    "units" |
    "visualRemaps"
>;

export class DatabaseNode extends BaseNode<TDatabase> {
    types: TypeNode[] = [];
    tags: TagNode[] = [];
    typeTags: TypeTagNode[] = [];
    traits: TraitNode[] = [];
    traitModifiers: TraitModifierNode[] = [];

    civilizations: CivilizationNode[] | ShellCivilizationNodeSlice[] | GameCivilizationNodeSlice[] = [];
    civilizationItems: CivilizationItemNode[] = [];
    civilizationTags: CivilizationTagNode[] = [];
    civilizationTraits: CivilizationTraitNode[] = [];
    legacyCivilizationTraits: LegacyCivilizationTraitNode[] = [];
    legacyCivilizations: LegacyCivilizationNode[] = [];

    buildings: BuildingNode[] = [];
    constructibles: ConstructibleNode[] = [];
    constructibleMaintenances: ConstructibleMaintenanceNode[] = [];
    constructibleValidDistricts: ConstructibleValidDistrictNode[] = [];
    constructibleYieldChanges: ConstructibleYieldChangeNode[] = [];

    units: UnitNode[] = [];
    unitCosts: UnitCostNode[] = [];
    unitReplaces: UnitReplaceNode[] = [];
    unitStats: UnitStatNode[] = [];

    englishText: EnglishTextNode[] = [];
    iconDefinitions: IconDefinitionNode[] = [];
    visualRemaps: VisualRemapNode[] = [];

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
