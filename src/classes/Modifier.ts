import { randomUUID } from "node:crypto";

import { TClassProperties, TObjectValues } from "../types";
import { COLLECTION, EFFECT } from "../constants";

import { Base } from "./Base";
import { Requirement } from "./Requirement";

type TModifier = TClassProperties<Modifier>;

export class Modifier extends Base<TModifier> implements TModifier {
    id: string = `${randomUUID()}`;
    collection: TObjectValues<typeof COLLECTION> = COLLECTION.OWNER;
    effect: TObjectValues<typeof EFFECT> = EFFECT.UNIT_ADJUST_MOVEMENT;
    runOnce = false;
    isPermanent = false;

    requirements: Requirement[] = [];
    arguments: Record<string, string | number> = {};

    constructor(payload: Partial<TModifier> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'Modifier',
            _attrs: {
                id: this.id,
                collection: this.collection,
                effect: this.effect,
                "run-once": this.runOnce ? "true" : "false",
                permanent: this.isPermanent ? "true" : "false",
            },
            _content: [
                {
                    _name: 'SubjectRequirements',
                    _content: this.requirements.map(requirement => requirement.toXmlElement())
                },
                ...Object.entries(this.arguments).map(([key, value]) => ({
                    _name: 'Argument',
                    _attrs: {
                        name: key
                    },
                    _content: value
                })),
            ]
        }
    }
}