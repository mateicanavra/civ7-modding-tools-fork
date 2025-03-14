import { BaseNode } from "./BaseNode";

export type TIconDefinitionNode = Pick<IconDefinitionNode,
    "id" |
    "path"
>;

export class IconDefinitionNode extends BaseNode<TIconDefinitionNode> {
    id = 'id';
    path: string | null = 'path';

    constructor(payload: Partial<TIconDefinitionNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            Row: {
                ID: this.id,
                Path: this.path
            }
        }
    }
}
