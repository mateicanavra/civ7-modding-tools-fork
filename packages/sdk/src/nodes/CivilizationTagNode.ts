import { BaseNode } from "./BaseNode";

export type TCivilizationTagNode = Pick<CivilizationTagNode,
    "civilizationDomain" |
    "civilizationType" |
    'tagType'
>;

export class CivilizationTagNode extends BaseNode<TCivilizationTagNode> {
    civilizationDomain: string | null = 'CIVILIZATION_';
    civilizationType: string | null = 'CIVILIZATION_';
    tagType: string | null = 'CIVILIZATION_';

    constructor(payload: Partial<TCivilizationTagNode> = {}) {
        super();
        this.fill(payload);
    }
}
