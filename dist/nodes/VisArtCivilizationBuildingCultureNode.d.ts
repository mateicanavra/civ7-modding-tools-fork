import { TObjectValues } from "../types";
import { BUILDING_CULTURES } from "../constants";
import { BaseNode } from "./BaseNode";
export type TVisArtCivilizationBuildingCultureNode = Pick<VisArtCivilizationBuildingCultureNode, "civilizationType" | "buildingCulture">;
export declare class VisArtCivilizationBuildingCultureNode extends BaseNode<TVisArtCivilizationBuildingCultureNode> {
    civilizationType: string | null;
    buildingCulture: TObjectValues<typeof BUILDING_CULTURES> | null;
    constructor(payload?: Partial<TVisArtCivilizationBuildingCultureNode>);
}
