import { BaseNode } from "./BaseNode";

export type TLegacyCivilizationNode = Pick<LegacyCivilizationNode,
    "adjective" |
    "civilizationType" |
    "age" |
    "fullName" |
    "name"
>;

export class LegacyCivilizationNode extends BaseNode<TLegacyCivilizationNode> {
    civilizationType: string | null = 'CIVILIZATION_';
    adjective: string | null = 'adjective';
    age: string | null = 'adjective';
    fullName: string | null = 'FullName';
    name: string | null = 'Name';

    constructor(payload: Partial<TLegacyCivilizationNode> = {}) {
        super();
        this.fill(payload);
    }
}
