import { randomUUID } from "node:crypto";

import { TObjectValues, TPartialRequired } from "../types";
import { COLLECTION, EFFECT } from "../constants";

import { BaseNode } from "./BaseNode";
import { ArgumentNode, TArgumentNode } from "./ArgumentNode";
import { ModifierRequirementNode, TModifierRequirementNode } from "./ModifierRequirementNode";
import { StringNode, TStringNode } from "./StringNode";

export type TModifierNode = Pick<ModifierNode,
    "id" |
    "strings" |
    "collection" |
    "effect" |
    "arguments" |
    "runOnce" |
    "permanent" |
    "requirements"
>;

export class ModifierNode extends BaseNode<TModifierNode> {
    _name = 'Modifier';

    id: string = `MOD_` + randomUUID().split('-').join('').toLocaleUpperCase();
    collection: TObjectValues<typeof COLLECTION> | null = COLLECTION.OWNER;
    effect: TObjectValues<typeof EFFECT> | null = EFFECT.CITY_ADJUST_YIELD_PER_RESOURCE;
    arguments: TArgumentNode[] = [];
    requirements: TPartialRequired<TModifierRequirementNode, 'type'>[] = [];
    strings: TStringNode[] = [];
    permanent: boolean | null = null;
    runOnce: boolean | null = null;

    constructor(payload: Partial<TModifierNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                id: this.id,
                collection: this.collection,
                effect: this.effect,
                ...(this.permanent !== null && { permanent: this.permanent ? 'true' : 'false' }),
                ...(this.runOnce !== null && { "run-once": this.runOnce ? 'true' : 'false' })
            },
            _content: [
                {
                    _name: 'SubjectRequirements',
                    _content: this.requirements.map(item => new ModifierRequirementNode(item).toXmlElement())
                },
                ...this.arguments.map(item => new ArgumentNode(item).toXmlElement()),
                ...this.strings.map(item => new StringNode(item).toXmlElement()),
            ]
        }
    }
}
