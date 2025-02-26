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

export type TDatabase = Pick<DatabaseNode,
    "typeTags" |
    "types" |
    "tags" |
    "constructibles" |
    "units" |
    "unitStats" |
    "unitCosts" |
    "unitReplaces" |
    "englishText" |
    "visualRemaps"
>;

export class DatabaseNode extends BaseNode<TDatabase> {
    typeTags: TypeTagNode[] = [];
    types: TypeNode[] = [];
    tags: TagNode[] = [];
    constructibles: ConstructibleNode[] = [];
    units: UnitNode[] = [];
    unitStats: UnitStatNode[] = [];
    unitCosts: UnitCostNode[] = [];
    unitReplaces: UnitReplaceNode[] = [];
    visualRemaps: VisualRemapNode[] = [];
    englishText: EnglishTextNode[] = [];

    constructor(payload: Partial<TDatabase> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            Database: {
                Types: this.types.map(item => item.toXmlElement()),
                Tags: this.tags.map(item => item.toXmlElement()),
                TypeTags: this.typeTags.map(item => item.toXmlElement()),
                Constructibles: this.constructibles.map(item => item.toXmlElement()),
                Units: this.units.map(item => item.toXmlElement()),
                Unit_Stats: this.unitStats.map(item => item.toXmlElement()),
                Unit_Costs: this.unitCosts.map(item => item.toXmlElement()),
                UnitReplaces: this.unitReplaces.map(item => item.toXmlElement()),
                VisualRemaps: this.visualRemaps.map(item => item.toXmlElement()),
                EnglishText: this.englishText.map(item => item.toXmlElement()),
            }
        }
    }
}