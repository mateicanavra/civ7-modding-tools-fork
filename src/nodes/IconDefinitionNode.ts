import { TObjectValues } from "../types";
import { KIND } from "../constants";

import { BaseNode } from "./BaseNode";
import { XmlElement } from "jstoxml";

export type TIconDefinitionNode = Pick<IconDefinitionNode, "id" | "path">;

export class IconDefinitionNode extends BaseNode<TIconDefinitionNode> {
    id = 'id';
    path: string = 'path';

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