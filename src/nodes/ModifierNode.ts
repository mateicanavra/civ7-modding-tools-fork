import { randomUUID } from "node:crypto";

import { TObjectValues } from "../types";
import { COLLECTION, EFFECT } from "../constants";

import { BaseNode } from "./BaseNode";
import { ArgumentNode, TArgumentNode } from "./ArgumentNode";
import { ModifierRequirementNode, TModifierRequirementNode } from "./ModifierRequirementNode";

export type TModifierNode = Pick<ModifierNode,
    "id" |
    "collection" |
    "effect" |
    "arguments" |
    "runOnce" |
    "permanent" |
    "requirements"
>;

export class ModifierNode extends BaseNode<TModifierNode> {
    _name = 'Modifier';

    id: string = randomUUID();
    collection: TObjectValues<typeof COLLECTION> = COLLECTION.OWNER;
    effect: TObjectValues<typeof EFFECT> = EFFECT.CITY_ADJUST_YIELD_PER_RESOURCE;
    arguments: TArgumentNode[] = [];
    requirements: TModifierRequirementNode[] = [];
    permanent: boolean | null = null;
    runOnce: boolean | null = null;

    constructor(payload: Partial<TModifierNode> = {}) {
        super();
        this.fill(payload);
    }

    fill = (payload: Partial<TModifierNode> = {}) => {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        this.arguments = this.arguments.map(item => new ArgumentNode(item));
        this.requirements = this.requirements.map(item => new ModifierRequirementNode(item));
        return this;
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
                ...this.arguments.map(item => new ArgumentNode(item).toXmlElement())
            ]
        }
    }
}
