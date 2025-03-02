import { TObjectValues } from "../types";
import { FEATURE } from "../constants";

import { BaseNode } from "./BaseNode";

export type TConstructibleValidFeatureNode = Pick<ConstructibleValidFeatureNode,
    "constructibleType" |
    "featureType"
>;

export class ConstructibleValidFeatureNode extends BaseNode<TConstructibleValidFeatureNode> {
    constructibleType = 'BUILDING_';
    featureType: TObjectValues<typeof FEATURE> = FEATURE.ICE;

    constructor(payload: Partial<TConstructibleValidFeatureNode> = {}) {
        super();
        this.fill(payload);
    }
}
