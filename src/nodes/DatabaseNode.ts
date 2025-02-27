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
import { ShellCivilizationNodeSlice } from "./slices/ShellCivilizationNodeSlice";
import { IconDefinitionNode } from "./IconDefinitionNode";
import { GameCivilizationNodeSlice } from "./slices/GameCivilizationNodeSlice";
import { CivilizationItemNode } from "./CivilizationItemNode";

export type TDatabase = Pick<DatabaseNode,
    "typeTags" |
    "types" |
    "tags" |
    "constructibles" |
    "legacyCivilizations" |
    "legacyCivilizationTraits" |
    "units" |
    "traits" |
    "unitStats" |
    "unitCosts" |
    "unitReplaces" |
    "englishText" |
    "traitModifiers" |
    "civilizationTraits" |
    "civilizationItems" |
    "civilizationTags" |
    "visualRemaps" |
    "iconDefinitions" |
    "civilizations"
>;

export class DatabaseNode extends BaseNode<TDatabase> {
    types: TypeNode[] = [];
    traits: TraitNode[] = [];
    typeTags: TypeTagNode[] = [];
    traitModifiers: TraitNode[] = [];
    tags: TagNode[] = [];
    constructibles: ConstructibleNode[] = [];
    civilizations: CivilizationNode[] = [];
    civilizationItems: CivilizationItemNode[] = [];
    civilizationTraits: CivilizationTraitNode[] = [];
    civilizationTags: CivilizationTagNode[] = [];
    legacyCivilizations: LegacyCivilizationNode[] = [];
    legacyCivilizationTraits: LegacyCivilizationTraitNode[] = [];
    units: UnitNode[] = [];
    unitStats: UnitStatNode[] = [];
    unitCosts: UnitCostNode[] = [];
    unitReplaces: UnitReplaceNode[] = [];
    visualRemaps: VisualRemapNode[] = [];
    englishText: EnglishTextNode[] = [];
    iconDefinitions: IconDefinitionNode[] = [];

    constructor(payload: Partial<TDatabase> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        const except = [];
        const additionalMapping = {
            unitStats: 'Unit_Stats',
            unitCosts: 'Unit_Costs',
        }
        const data = Object.keys(this)
            .filter(key => !except.includes(key))
            .reduce((prev, current) => {
                if (Array.isArray(this[current])) {
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
