import { randomUUID } from "node:crypto";

import { TObjectValues } from "../types";
import { KIND } from "../constants";

import { BaseNode } from "./BaseNode";

export type TVisualRemapNode = Pick<VisualRemapNode,
    "id" |
    "displayName" |
    "kind" |
    "from" |
    "to"
>;

export class VisualRemapNode extends BaseNode<TVisualRemapNode> {
    id: string = randomUUID();
    displayName: string = 'LOC_';
    kind: TObjectValues<typeof KIND> = KIND.UNIT;
    from: string = 'UNIT_';
    to: string = 'UNIT_';

    constructor(payload: Partial<TVisualRemapNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            Row: {
                ID: this.id,
                DisplayName: this.displayName,
                Kind: this.kind,
                From: this.from,
                To: this.to
            }
        }
    }
}