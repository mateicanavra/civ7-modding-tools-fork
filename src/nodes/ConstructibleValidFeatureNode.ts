import { TObjectValues } from "../types";
import { FEATURE } from "../constants";

import { BaseNode } from "./BaseNode";

export type TConstructibleValidFeatureNode = Pick<ConstructibleValidFeatureNode,
    "constructibleType" |
    "featureType"
>;

export class ConstructibleValidFeatureNode extends BaseNode<TConstructibleValidFeatureNode> {
    constructibleType: string | null = 'BUILDING_';
    featureType: TObjectValues<typeof FEATURE> | null = FEATURE.ICE;

    constructor(payload: Partial<TConstructibleValidFeatureNode> = {}) {
        super();
        this.fill(payload);
    }
}
