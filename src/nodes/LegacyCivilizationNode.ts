import { BaseNode } from "./BaseNode";

export type TLegacyCivilizationNode = Pick<LegacyCivilizationNode,
    "adjective" |
    "civilizationType" |
    "age" |
    "fullName" |
    "name"
>;

export class LegacyCivilizationNode extends BaseNode<TLegacyCivilizationNode> {
    civilizationType = 'CIVILIZATION_';
    adjective = 'adjective';
    age = 'adjective';
    fullName = 'FullName';
    name = 'Name';

    constructor(payload: Partial<TLegacyCivilizationNode> = {}) {
        super();
        this.fill(payload);
    }
}