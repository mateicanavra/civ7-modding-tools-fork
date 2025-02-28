import { randomUUID } from "node:crypto";

import { BaseNode } from "./BaseNode";

import { TObjectValues } from "../types";
import { AGE } from "../constants";

export type TCriteriaNode = Pick<CriteriaNode, "id" | "any" | "ages">;

export class CriteriaNode extends BaseNode<TCriteriaNode> {
    _name = 'Criteria';

    id: string = randomUUID();
    ages: TObjectValues<typeof AGE>[] = [];
    any: boolean | null = null;

    constructor(payload: Partial<TCriteriaNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                id: this.id,
                ...(this.any ? { any: "true" } : {}),
            },
            _content: this.ages.length
                ? this.ages.map(AgeInUse => ({ AgeInUse }))
                : { AlwaysMet: '' }
        }
    }
}
