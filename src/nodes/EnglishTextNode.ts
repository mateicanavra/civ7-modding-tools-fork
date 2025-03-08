import { BaseNode } from "./BaseNode";

export type TEnglishTextNode = Pick<EnglishTextNode, "tag" | "text">;

export class EnglishTextNode extends BaseNode<TEnglishTextNode> {
    _name = 'Row';
    tag: string | null = 'LOC_';
    text: string | number | null = 'text'

    constructor(payload: Partial<TEnglishTextNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                Tag: this.tag,
            },
            _content: {
                Text: this.text
            }
        }
    }
}
