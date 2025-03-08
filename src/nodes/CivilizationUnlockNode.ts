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
    civilizationDomain: string | null = '';
    civilizationType: `CIVILIZATION_${string}` | null = 'CIVILIZATION_';
    type: `CIVILIZATION_${string}` | null = 'CIVILIZATION_';
    kind: TObjectValues<typeof KIND> = KIND.CIVILIZATION;
    name: string | null = null;
    description: string | null = null;
    icon: string | null = null;
    ageDomain: string | null = 'StandardAges';
    ageType: TObjectValues<typeof AGE> | null = AGE.ANTIQUITY;

    constructor(payload: Partial<TCivilizationUnlockNode> = {}) {
        super();
        this.fill(payload);
    }
}
