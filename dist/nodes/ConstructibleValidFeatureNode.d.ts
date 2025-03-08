import { TObjectValues } from "../types";
import { FEATURE } from "../constants";
import { BaseNode } from "./BaseNode";
export type TConstructibleValidFeatureNode = Pick<ConstructibleValidFeatureNode, "constructibleType" | "featureType">;
export declare class ConstructibleValidFeatureNode extends BaseNode<TConstructibleValidFeatureNode> {
    constructibleType: string | null;
    featureType: TObjectValues<typeof FEATURE> | null;
    constructor(payload?: Partial<TConstructibleValidFeatureNode>);
}
