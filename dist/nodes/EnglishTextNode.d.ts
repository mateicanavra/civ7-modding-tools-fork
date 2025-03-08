import { BaseNode } from "./BaseNode";
export type TEnglishTextNode = Pick<EnglishTextNode, "tag" | "text">;
export declare class EnglishTextNode extends BaseNode<TEnglishTextNode> {
    _name: string;
    tag: string | null;
    text: string | number | null;
    constructor(payload?: Partial<TEnglishTextNode>);
    toXmlElement(): {
        _name: string;
        _attrs: {
            Tag: string | null;
        };
        _content: {
            Text: string | number | null;
        };
    };
}
