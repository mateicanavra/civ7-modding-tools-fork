import { TObjectValues } from "../types";
import { UNIT_CULTURE } from "../constants";
import { BaseNode } from "./BaseNode";
export type TVisArtCivilizationUnitCultureNode = Pick<VisArtCivilizationUnitCultureNode, "civilizationType" | "unitCulture">;
export declare class VisArtCivilizationUnitCultureNode extends BaseNode<TVisArtCivilizationUnitCultureNode> {
    civilizationType: `CIVILIZATION_${string}` | null;
    unitCulture: TObjectValues<typeof UNIT_CULTURE> | null;
    constructor(payload?: Partial<TVisArtCivilizationUnitCultureNode>);
}
