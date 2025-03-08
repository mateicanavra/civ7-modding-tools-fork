import { BaseNode } from "./BaseNode";
export type TStringNode = Pick<StringNode, "context" | "value">;
export declare class StringNode extends BaseNode<TStringNode> {
    _name: string;
    context: string | null;
    value?: string | number | null;
    constructor(payload?: Partial<TStringNode>);
    toXmlElement(): {
        _name: string;
        _attrs: {
            context: string | null;
        };
        _content: string | number | null | undefined;
    };
}
