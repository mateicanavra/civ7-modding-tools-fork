import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { AGE, KIND } from "../constants";
export type TCivilizationUnlockNode = Pick<CivilizationUnlockNode, "civilizationDomain" | "civilizationType" | "type" | "kind" | "name" | "description" | "ageDomain" | "ageType" | "icon">;
export declare class CivilizationUnlockNode extends BaseNode<TCivilizationUnlockNode> {
    civilizationDomain: string | null;
    civilizationType: `CIVILIZATION_${string}` | null;
    type: `CIVILIZATION_${string}` | null;
    kind: TObjectValues<typeof KIND>;
    name: string | null;
    description: string | null;
    icon: string | null;
    ageDomain: string | null;
    ageType: TObjectValues<typeof AGE> | null;
    constructor(payload?: Partial<TCivilizationUnlockNode>);
}
