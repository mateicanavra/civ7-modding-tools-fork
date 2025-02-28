import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { AGE, KIND } from "../constants";

export type TCivilizationUnlockNode = Pick<CivilizationUnlockNode,
    "civilizationDomain" |
    "civilizationType" |
    "type" |
    "kind" |
    "name" |
    "description" |
    "ageDomain" |
    "ageType" |
    "icon"
>;

export class CivilizationUnlockNode extends BaseNode<TCivilizationUnlockNode> {
    civilizationDomain = '';
    civilizationType: `CIVILIZATION_${string}` = 'CIVILIZATION_';
    type: `CIVILIZATION_${string}` = 'CIVILIZATION_';
    kind: TObjectValues<typeof KIND> = KIND.CIVILIZATION;
    name: string = '';
    description: string = '';
    icon: string = '';
    ageDomain = 'StandardAges';
    ageType: TObjectValues<typeof AGE> = AGE.ANTIQUITY;

    constructor(payload: Partial<TCivilizationUnlockNode> = {}) {
        super();
        this.fill(payload);
    }
}
