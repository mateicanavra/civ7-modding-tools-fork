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
                if(['fill'].includes(key)){
                    return;
                }
                if (this[key] === null || this[key] === undefined) {
                    return;
                }
                if (typeof this[key] === 'boolean') {
                    result[key] = this[key] ? 'true' : 'false';
                    return;
                }
                let nodeAttributeName = lodash.startCase(key).replace(/ /g, "")
                result[nodeAttributeName] = this[key]
            });
        return result;
    }

    toXmlElement(): XmlElement | XmlElement[] {
        return {
            _name: this._name,
            _attrs: this.getAttributes(),
        };
    }
}