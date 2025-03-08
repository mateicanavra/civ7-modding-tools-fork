import { BaseNode } from "./BaseNode";
export type TLegacyCivilizationNode = Pick<LegacyCivilizationNode, "adjective" | "civilizationType" | "age" | "fullName" | "name">;
export declare class LegacyCivilizationNode extends BaseNode<TLegacyCivilizationNode> {
    civilizationType: string | null;
    adjective: string | null;
    age: string | null;
    fullName: string | null;
    name: string | null;
    constructor(payload?: Partial<TLegacyCivilizationNode>);
}
