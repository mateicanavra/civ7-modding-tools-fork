import { TObjectValues } from "../types";
import { UNIT_CULTURE } from "../constants";

import { BaseNode } from "./BaseNode";

export type TVisArtCivilizationUnitCultureNode = Pick<VisArtCivilizationUnitCultureNode,
    "civilizationType" |
    "unitCulture"
>;

export class VisArtCivilizationUnitCultureNode extends BaseNode<TVisArtCivilizationUnitCultureNode> {
    civilizationType: `CIVILIZATION_${string}` = 'CIVILIZATION_';
    unitCulture: TObjectValues<typeof UNIT_CULTURE> = UNIT_CULTURE.MED;

    constructor(payload: Partial<TVisArtCivilizationUnitCultureNode> = {}) {
        super();
        this.fill(payload);
    }
}
