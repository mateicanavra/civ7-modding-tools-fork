import { BaseNode } from "./BaseNode";
export type TVisualRemapNode = Pick<VisualRemapNode, "id" | "displayName" | "kind" | "from" | "to">;
export declare class VisualRemapNode extends BaseNode<TVisualRemapNode> {
    id: string | null;
    displayName: string | null;
    kind: string | null;
    from: string | null;
    to: string | null;
    constructor(payload?: Partial<TVisualRemapNode>);
    toXmlElement(): {
        Row: {
            ID: string | null;
            DisplayName: string | null;
            Kind: string | null;
            From: string | null;
            To: string | null;
        };
    };
}
