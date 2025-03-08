import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { KIND } from "../constants";
export type TCivilizationItemNode = Pick<CivilizationItemNode, "civilizationDomain" | "civilizationType" | "type" | "kind" | "name" | "description" | "icon">;
export declare class CivilizationItemNode extends BaseNode<TCivilizationItemNode> {
    civilizationDomain: string | null;
    civilizationType: `CIVILIZATION_${string}` | null;
    type: string | null;
    kind: TObjectValues<typeof KIND> | null;
    name: string | null;
    description: string | null;
    icon: string | null;
    constructor(payload?: Partial<TCivilizationItemNode>);
}
