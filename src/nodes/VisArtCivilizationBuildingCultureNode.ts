import { TObjectValues } from "../types";
import { BUILDING_CULTURES } from "../constants";

import { BaseNode } from "./BaseNode";

export type TVisArtCivilizationBuildingCultureNode = Pick<VisArtCivilizationBuildingCultureNode,
    "civilizationType" |
    "buildingCulture"
>;

export class VisArtCivilizationBuildingCultureNode extends BaseNode<TVisArtCivilizationBuildingCultureNode> {
    civilizationType: `CIVILIZATION_${string}` = 'CIVILIZATION_';
    buildingCulture: TObjectValues<typeof BUILDING_CULTURES> = BUILDING_CULTURES.MED;

    constructor(payload: Partial<TVisArtCivilizationBuildingCultureNode> = {}) {
        super();
        this.fill(payload);
    }
}
