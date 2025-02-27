import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { KIND } from "../constants";

export type TCivilizationItemNode = Pick<CivilizationItemNode,
    "civilizationDomain" |
    "civilizationType" |
    "type" |
    "kind" |
    "name" |
    "description" |
    "icon"
>;

export class CivilizationItemNode extends BaseNode<TCivilizationItemNode> {
    civilizationDomain = '';
    civilizationType = '';
    type = '';
    kind: TObjectValues<typeof KIND> = KIND.UNIT;
    name: string = '';
    description: string = '';
    icon: string = '';

    constructor(payload: Partial<TCivilizationItemNode> = {}) {
        super();
        this.fill(payload);
    }
}
