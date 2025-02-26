import { BaseNode } from "./BaseNode";
import { TypeTagNode } from "./TypeTagNode";
import { TypeNode } from "./TypeNode";
import { ConstructibleNode } from "./ConstructibleNode";
import { UnitNode } from "./UnitNode";
import { TagNode } from "./TagNode";
import { UnitStat } from "../classes";

type TDatabase = Pick<Database,
    "typeTags" |
    "types" |
    "tags" |
    "constructibles" |
    "units"
>;

export class Database extends BaseNode<TDatabase> {
    typeTags: TypeTagNode[] = [];
    types: TypeNode[] = [];
    tags: TagNode[] = [];
    constructibles: ConstructibleNode[] = [];
    units: UnitNode[] = [];
    unitStats: UnitStat[] = [];

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
                Unit_Costs: this.unitStats.map(item => item.toXmlElement()),
            }
        }
    }
}