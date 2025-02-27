import { BaseNode } from "./BaseNode";

export type TCivilizationTagNode = Pick<CivilizationTagNode, "civilizationDomain" | "civilizationType" | 'tagType'>;

export class CivilizationTagNode extends BaseNode<TCivilizationTagNode> {
    civilizationDomain = 'CIVILIZATION_';
    civilizationType = 'CIVILIZATION_';
    tagType = 'CIVILIZATION_';

    constructor(payload: Partial<TCivilizationTagNode> = {}) {
        super();
        this.fill(payload);
    }
}