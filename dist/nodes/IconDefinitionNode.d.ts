import { BaseNode } from "./BaseNode";
export type TIconDefinitionNode = Pick<IconDefinitionNode, "id" | "path">;
export declare class IconDefinitionNode extends BaseNode<TIconDefinitionNode> {
    id: string;
    path: string | null;
    constructor(payload?: Partial<TIconDefinitionNode>);
    toXmlElement(): {
        Row: {
            ID: string;
            Path: string | null;
        };
    };
}
