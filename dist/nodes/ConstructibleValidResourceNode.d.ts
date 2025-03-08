import { TObjectValues } from "../types";
import { RESOURCE } from "../constants";
import { BaseNode } from "./BaseNode";
export type TConstructibleValidResourceNode = Pick<ConstructibleValidResourceNode, "constructibleType" | "rate" | "resourceType">;
export declare class ConstructibleValidResourceNode extends BaseNode<TConstructibleValidResourceNode> {
    constructibleType: string | null;
    resourceType: TObjectValues<typeof RESOURCE> | null;
    rate: number | null;
    constructor(payload?: Partial<TConstructibleValidResourceNode>);
}
