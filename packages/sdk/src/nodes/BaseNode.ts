import { XmlElement } from "jstoxml";
import * as lodash from "lodash";

import { fill } from "../utils";

export class BaseNode<T extends Object = object> {
    _name: string = 'Row';

    constructor(payload: Partial<T> = {}) {
        this.fill(payload);
    }

    fill = fill<T>;

    private getAttributes() {
        const result: Record<string, string | number> = {};
        Object.keys(this)
            .filter(key => !key.startsWith('_'))
            .forEach(key => {
                if (['fill'].includes(key)) {
                    return;
                }
                if (this[key] === null || this[key] === undefined || this[key] === '') {
                    return;
                }

                let nodeAttributeName = lodash.startCase(key).replace(/ /g, "")
                if (typeof this[key] === 'boolean') {
                    result[nodeAttributeName] = this[key] ? 'true' : 'false';
                    return;
                }
                result[nodeAttributeName] = this[key]
            });
        return result;
    }

    insertOrIgnore() {
        if (!['Row', 'InsertOrIgnore'].includes(this._name)) {
            throw new Error('Only Row|InsertOrIgnore nodes can be transformed to InsertOrIgnore.');
        }

        this._name = 'InsertOrIgnore';

        return this;
    }

    toXmlElement(): XmlElement | XmlElement[] | null {
        return {
            _name: this._name,
            _attrs: this.getAttributes(),
        };
    }
}
